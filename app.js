const STORAGE_KEY = "heliAppData";
const DEFAULT_MODEL_NAME = "ALIGN TREX 150 DFC";
const DEFAULT_THEME = "#c0501a";

const TAB_DEFS = [
  { id: "flights", label: "Vols", icon: "V" },
  { id: "batteries", label: "Batteries", icon: "B" },
  { id: "maintenance", label: "Maintenance", icon: "M" },
  { id: "stock", label: "Stock", icon: "S" },
  { id: "purchases", label: "Achats", icon: "A" },
  { id: "backup", label: "Sauvegarde", icon: "D" },
  { id: "settings", label: "Reglages", icon: "R" }
];

const THEME_PRESETS = [
  { name: "Copper", color: "#c0501a" },
  { name: "Ocean", color: "#1f6aa5" },
  { name: "Forest", color: "#2a7b50" },
  { name: "Cobalt", color: "#2d4aa1" },
  { name: "Crimson", color: "#a22a2a" },
  { name: "Amber", color: "#d88b1f" }
];

const defaultSettings = {
  tabOrder: TAB_DEFS.map((tab) => tab.id),
  stockSort: { key: "reference", dir: "asc" },
  stockBatterySort: { key: "number", dir: "asc" },
  stockBatteryNumberPlacement: "first",
  lastTab: "flights"
};

const cloneData = (value) => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const defaultData = {
  models: [],
  activeModelId: null,
  settings: cloneData(defaultSettings)
};

const el = (id) => document.getElementById(id);

const flightForm = document.getElementById("flightForm");
const batteryForm = document.getElementById("batteryForm");
const maintenanceForm = document.getElementById("maintenanceForm");
const stockForm = document.getElementById("stockForm");
const purchaseForm = document.getElementById("purchaseForm");
const modelForm = document.getElementById("modelForm");

const flightList = el("flightList");
const batteryList = el("batteryList");
const maintenanceList = el("maintenanceList");
const stockList = el("stockList");
const stockBatteryList = el("stockBatteryList");
const purchaseList = el("purchaseList");
const modelList = el("modelList");
const tabOrderList = el("tabOrderList");
const tabsContainer = el("tabsContainer");
const flightBattery = el("flightBattery");

const statFlights = el("statFlights");
const statMinutes = el("statMinutes");
const statBatteries = el("statBatteries");

const stockSubmit = el("stockSubmit");
const stockCancel = el("stockCancel");
const stockSortKey = el("stockSortKey");
const stockSortDir = el("stockSortDir");
const stockBatterySort = el("stockBatterySort");
const stockBatteryNumberPlacement = el("stockBatteryNumberPlacement");
const batterySortKey = el("batterySortKey");
const batteryNumberPlacement = el("batteryNumberPlacement");
const exportBtn = el("exportBtn");
const importBtn = el("importBtn");
const importFile = el("importFile");
const importStatus = el("importStatus");
const themeColorInput = el("themeColor");
const themeResetBtn = el("themeReset");
const themePresets = el("themePresets");
const modelNameEl = el("modelName");
const modelSubtitle = el("modelSubtitle");
const modelSelect = el("modelSelect");

const uid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

const coerceArray = (value) => Array.isArray(value) ? value : [];

const createModel = (name = DEFAULT_MODEL_NAME, themeColor = DEFAULT_THEME) => ({
  id: uid(),
  name,
  themeColor,
  flights: [],
  batteries: [],
  maintenance: [],
  stock: [],
  purchases: []
});

const normalizeModel = (model) => ({
  id: model.id || uid(),
  name: model.name || "Modele",
  themeColor: model.themeColor || DEFAULT_THEME,
  flights: coerceArray(model.flights),
  batteries: coerceArray(model.batteries),
  maintenance: coerceArray(model.maintenance),
  stock: coerceArray(model.stock),
  purchases: coerceArray(model.purchases)
});

const normalizeTabOrder = (order) => {
  const allowed = new Set(TAB_DEFS.map((tab) => tab.id));
  const cleaned = coerceArray(order).filter((id) => allowed.has(id));
  TAB_DEFS.forEach((tab) => {
    if (!cleaned.includes(tab.id)) cleaned.push(tab.id);
  });
  return cleaned;
};

const normalizeSettings = (settings = {}) => ({
  ...cloneData(defaultSettings),
  ...settings,
  stockSort: { ...defaultSettings.stockSort, ...(settings.stockSort || {}) },
  stockBatterySort: { ...defaultSettings.stockBatterySort, ...(settings.stockBatterySort || {}) },
  stockBatteryNumberPlacement: settings.stockBatteryNumberPlacement || defaultSettings.stockBatteryNumberPlacement,
  tabOrder: normalizeTabOrder(settings.tabOrder || defaultSettings.tabOrder)
});

const normalizeImported = (incoming) => {
  const settings = normalizeSettings(incoming.settings || {});
  if (Array.isArray(incoming.models)) {
    const models = incoming.models.map(normalizeModel);
    const activeMatch = models.find((model) => model.id === incoming.activeModelId);
    const activeModelId = (activeMatch && activeMatch.id) || (models[0] && models[0].id) || null;
    return { models: models.length ? models : [createModel()], activeModelId, settings };
  }

  const modelTheme = incoming.settings && incoming.settings.themeColor ? incoming.settings.themeColor : DEFAULT_THEME;
  const model = createModel(incoming.modelName || DEFAULT_MODEL_NAME, modelTheme);
  model.flights = coerceArray(incoming.flights);
  model.batteries = coerceArray(incoming.batteries);
  model.maintenance = coerceArray(incoming.maintenance);
  model.stock = coerceArray(incoming.stock).map((item) => ({ reference: "", ...item }));
  model.purchases = coerceArray(incoming.purchases);

    return { models: [model], activeModelId: model.id, settings };
};

const loadData = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const model = createModel();
    return { models: [model], activeModelId: model.id, settings: cloneData(defaultSettings) };
  }
  try {
    const parsed = JSON.parse(raw);
    return normalizeImported(parsed);
  } catch {
    const model = createModel();
    return { models: [model], activeModelId: model.id, settings: cloneData(defaultSettings) };
  }
};

const saveData = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

let data = loadData();
let editingStockId = null;

const getActiveModel = () => {
  const model = data.models.find((entry) => entry.id === data.activeModelId);
  return model || data.models[0];
};

const updateHeader = () => {
  const model = getActiveModel();
  if (!model) return;
  modelNameEl.textContent = model.name;
  modelSubtitle.textContent = "Suivi des vols, batteries, maintenance, stock et achats.";
  document.title = `${model.name} - Gestion`;
};

const updateStats = () => {
  const model = getActiveModel();
  const totalFlights = model.flights.length;
  const totalMinutes = model.flights.reduce((sum, flight) => sum + (Number(flight.duration) || 0), 0);
  statFlights.textContent = totalFlights;
  statMinutes.textContent = totalMinutes;
  statBatteries.textContent = model.batteries.length;
};

const renderBatteryOptions = () => {
  const model = getActiveModel();
  const current = flightBattery.value;
  flightBattery.innerHTML = '<option value="">Sans batterie</option>';
  const sorted = sortBatteries(model.batteries);
  sorted.forEach((battery) => {
    const option = document.createElement("option");
    option.value = battery.id;
    option.textContent = battery.name;
    flightBattery.append(option);
  });
  flightBattery.value = current;
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("fr-FR");
};

const formatNumber = (value) => (Number.isFinite(value) ? value : "-");

const voltageFromCells = (cells) => {
  const count = Number(cells);
  if (!Number.isFinite(count) || count <= 0) return null;
  return Number((count * 3.7).toFixed(1));
};

const getBatteryById = (id) => {
  const model = getActiveModel();
  return model.batteries.find((battery) => battery.id === id);
};

const renderFlights = () => {
  const model = getActiveModel();
  flightList.innerHTML = "";
  if (model.flights.length === 0) {
    flightList.innerHTML = "<p class=\"meta\">Aucun vol enregistre.</p>";
    return;
  }
  const sorted = [...model.flights].sort((a, b) => new Date(b.date) - new Date(a.date));
  sorted.forEach((flight) => {
    const battery = flight.batteryId ? getBatteryById(flight.batteryId) : null;
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <header>
        <h3>${formatDate(flight.date)} - ${formatNumber(flight.duration)} min</h3>
        <div class="actions">
          <button class="danger" data-action="delete">Supprimer</button>
        </div>
      </header>
      <div class="meta">Batterie: ${battery ? battery.name : "-"}</div>
      <div class="meta">${flight.notes ? flight.notes : ""}</div>
    `;
    item.querySelector("button").addEventListener("click", () => deleteFlight(flight.id));
    flightList.append(item);
  });
};

const renderBatteries = () => {
  const model = getActiveModel();
  batteryList.innerHTML = "";
  if (model.batteries.length === 0) {
    batteryList.innerHTML = "<p class=\"meta\">Aucune batterie.</p>";
    return;
  }
  const sorted = sortBatteries(model.batteries);
  sorted.forEach((battery) => {
    const item = document.createElement("div");
    item.className = "item";
    const cycleLabel = battery.cycles ? `${battery.cycles} cycles` : "0 cycle";
    const voltage = Number.isFinite(battery.voltage)
      ? `${battery.voltage} V`
      : (battery.cells ? `${voltageFromCells(battery.cells)} V` : "-");
    const discharge = Number.isFinite(battery.dischargeRate) ? `${battery.dischargeRate} C` : "-";
    const number = battery.number ? battery.number : "";
    item.innerHTML = `
      <header>
        <h3>${battery.name} ${number}</h3>
        <div class="actions">
          <button class="secondary" data-action="cycle">+1 cycle</button>
          <button class="secondary" data-action="duplicate">Dupliquer</button>
          <button class="danger" data-action="delete">Supprimer</button>
        </div>
      </header>
      <div class="meta">${battery.capacity ? battery.capacity + " mAh" : "-"} ${battery.cells ? "| " + battery.cells + "S" : ""} ${voltage !== "-" ? "| " + voltage : ""} ${discharge !== "-" ? "| " + discharge : ""}</div>
      <div class="meta">Derniere utilisation: ${formatDate(battery.lastUsed)}</div>
      <div class="tags">
        <span class="tag">${cycleLabel}</span>
      </div>
      <div class="meta">${battery.notes ? battery.notes : ""}</div>
    `;
    const [cycleBtn, duplicateBtn, deleteBtn] = item.querySelectorAll("button");
    cycleBtn.addEventListener("click", () => incrementCycle(battery.id));
    duplicateBtn.addEventListener("click", () => duplicateBattery(battery.id));
    deleteBtn.addEventListener("click", () => deleteBattery(battery.id));
    batteryList.append(item);
  });
};

const dueStatus = (task) => {
  const model = getActiveModel();
  const totalFlights = model.flights.length;
  const now = new Date();
  const lastDate = task.lastDoneDate ? new Date(task.lastDoneDate) : null;
  const nextDate = task.intervalDays && lastDate ? new Date(lastDate.getTime() + task.intervalDays * 86400000) : null;
  const nextFlight = task.intervalFlights ? (task.lastDoneFlights || 0) + task.intervalFlights : null;

  let isDue = false;
  if (!lastDate && (task.intervalDays || task.intervalFlights)) {
    isDue = true;
  }
  if (nextDate && nextDate < now) {
    isDue = true;
  }
  if (nextFlight !== null && totalFlights >= nextFlight) {
    isDue = true;
  }

  return { isDue, nextDate, nextFlight };
};

const renderMaintenance = () => {
  const model = getActiveModel();
  maintenanceList.innerHTML = "";
  if (model.maintenance.length === 0) {
    maintenanceList.innerHTML = "<p class=\"meta\">Aucune tache.</p>";
    return;
  }
  model.maintenance.forEach((task) => {
    const status = dueStatus(task);
    const item = document.createElement("div");
    item.className = "item";
    const statusTag = status.isDue ? "tag warn" : "tag ok";
    const statusText = status.isDue ? "A faire" : "OK";
    const nextDateLabel = status.nextDate ? formatDate(status.nextDate) : "-";
    const nextFlightLabel = status.nextFlight !== null ? status.nextFlight + " vols" : "-";
    item.innerHTML = `
      <header>
        <h3>${task.title}</h3>
        <div class="actions">
          <button class="secondary" data-action="done">Marquer fait</button>
          <button class="danger" data-action="delete">Supprimer</button>
        </div>
      </header>
      <div class="tags">
        <span class="${statusTag}">${statusText}</span>
        <span class="tag">Prochaine date: ${nextDateLabel}</span>
        <span class="tag">Prochain vol: ${nextFlightLabel}</span>
      </div>
      <div class="meta">Derniere: ${formatDate(task.lastDoneDate)} | Vols: ${task.lastDoneFlights !== undefined && task.lastDoneFlights !== null ? task.lastDoneFlights : 0}</div>
      <div class="meta">${task.notes ? task.notes : ""}</div>
    `;
    const [doneBtn, deleteBtn] = item.querySelectorAll("button");
    doneBtn.addEventListener("click", () => markMaintenanceDone(task.id));
    deleteBtn.addEventListener("click", () => deleteMaintenance(task.id));
    maintenanceList.append(item);
  });
};

const getStockSort = () => data.settings.stockSort || defaultSettings.stockSort;
const getBatteryStockSort = () => data.settings.stockBatterySort || defaultSettings.stockBatterySort;
const getBatteryNumberPlacement = () => data.settings.stockBatteryNumberPlacement || defaultSettings.stockBatteryNumberPlacement;

const sortStock = (items) => {
  const { key, dir } = getStockSort();
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (key === "quantity") {
      return (a.quantity || 0) - (b.quantity || 0);
    }
    if (key === "reference") {
      return (a.reference || "").localeCompare(b.reference || "");
    }
    return (a.name || "").localeCompare(b.name || "");
  });
  if (dir === "desc") sorted.reverse();
  return sorted;
};

const sortBatteries = (batteries) => {
  const collator = new Intl.Collator("fr-FR", { numeric: true, sensitivity: "base" });
  const { key, dir } = getBatteryStockSort();
  const numberPlacement = getBatteryNumberPlacement();
  const sorted = [...batteries].sort((a, b) => {
    const numberA = (a.number || "").trim();
    const numberB = (b.number || "").trim();
    const nameA = (a.name || "").trim();
    const nameB = (b.name || "").trim();
    const hasNumberA = numberA.length > 0;
    const hasNumberB = numberB.length > 0;
    const compareNumber = () => {
      if (hasNumberA && hasNumberB) {
        const numberCompare = collator.compare(numberA, numberB);
        if (numberCompare !== 0) return numberCompare;
      }
      if (hasNumberA !== hasNumberB) {
        return numberPlacement === "first" ? (hasNumberA ? -1 : 1) : (hasNumberA ? 1 : -1);
      }
      return 0;
    };

    if (key === "name") {
      const nameCompare = collator.compare(nameA, nameB);
      if (nameCompare !== 0) return nameCompare;
    }

    const numberCompare = compareNumber();
    if (numberCompare !== 0) return numberCompare;

    if (key !== "name") {
      const nameCompare = collator.compare(nameA, nameB);
      if (nameCompare !== 0) return nameCompare;
    }

    return 0;
  });
  if (dir === "desc") sorted.reverse();
  return sorted;
};

const syncBatterySortControls = () => {
  const batterySort = getBatteryStockSort();
  const placement = getBatteryNumberPlacement();
  const sortValue = `${batterySort.key}-${batterySort.dir}`;
  if (stockBatterySort) stockBatterySort.value = sortValue;
  if (batterySortKey) batterySortKey.value = sortValue;
  if (stockBatteryNumberPlacement) stockBatteryNumberPlacement.value = placement;
  if (batteryNumberPlacement) batteryNumberPlacement.value = placement;
};

const renderStock = () => {
  const model = getActiveModel();
  stockList.innerHTML = "";
  if (model.stock.length === 0) {
    stockList.innerHTML = "<p class=\"meta\">Aucune piece.</p>";
  }
  const sorted = sortStock(model.stock);
  sorted.forEach((itemData) => {
    const item = document.createElement("div");
    item.className = "item";
    const low = Number.isFinite(itemData.minimum) && itemData.quantity <= itemData.minimum;
    const statusTag = low ? "tag bad" : "tag ok";
    const statusText = low ? "Stock bas" : "OK";
    item.innerHTML = `
      <header>
        <h3>${itemData.name}</h3>
        <div class="actions">
          <button class="secondary" data-action="edit">Modifier</button>
          <button class="secondary" data-action="duplicate">Dupliquer</button>
          <button class="danger" data-action="delete">Supprimer</button>
        </div>
      </header>
      <div class="tags">
        <span class="tag">Ref: ${itemData.reference ? itemData.reference : "-"}</span>
        <span class="tag">Quantite: ${itemData.quantity}</span>
        <span class="tag">Mini: ${itemData.minimum !== undefined && itemData.minimum !== null ? itemData.minimum : 0}</span>
        <span class="${statusTag}">${statusText}</span>
      </div>
      <div class="meta">${itemData.location ? itemData.location : ""}</div>
    `;
    const [editBtn, duplicateBtn, deleteBtn] = item.querySelectorAll("button");
    editBtn.addEventListener("click", () => startEditStock(itemData.id));
    duplicateBtn.addEventListener("click", () => duplicateStock(itemData.id));
    deleteBtn.addEventListener("click", () => deleteStock(itemData.id));
    stockList.append(item);
  });
  renderStockBatteries();
};

const renderStockBatteries = () => {
  if (!stockBatteryList) return;
  const model = getActiveModel();
  stockBatteryList.innerHTML = "";
  if (model.batteries.length === 0) {
    stockBatteryList.innerHTML = "<p class=\"meta\">Aucune batterie en stock.</p>";
    return;
  }
  const sorted = sortBatteries(model.batteries);

  sorted.forEach((battery) => {
    const item = document.createElement("div");
    item.className = "item";
    const voltage = Number.isFinite(battery.voltage)
      ? `${battery.voltage} V`
      : (battery.cells ? `${voltageFromCells(battery.cells)} V` : "-");
    const discharge = Number.isFinite(battery.dischargeRate) ? `${battery.dischargeRate} C` : "-";
    const number = battery.number ? battery.number : "-";
    item.innerHTML = `
      <header>
        <h3>${battery.name}</h3>
      </header>
      <div class="tags">
        <span class="tag">Numero: ${number}</span>
        <span class="tag">${battery.capacity ? battery.capacity + " mAh" : "-"}</span>
        <span class="tag">${battery.cells ? battery.cells + "S" : "-"}</span>
        <span class="tag">${voltage}</span>
        <span class="tag">${discharge}</span>
      </div>
      <div class="meta">Cycles: ${battery.cycles || 0} | Derniere: ${formatDate(battery.lastUsed)}</div>
      <div class="meta">${battery.notes ? battery.notes : ""}</div>
    `;
    stockBatteryList.append(item);
  });
};
const renderPurchases = () => {
  const model = getActiveModel();
  purchaseList.innerHTML = "";
  if (model.purchases.length === 0) {
    purchaseList.innerHTML = "<p class=\"meta\">Aucun achat enregistre.</p>";
    return;
  }
  const sorted = [...model.purchases].sort((a, b) => new Date(b.date) - new Date(a.date));
  sorted.forEach((purchase) => {
    const item = document.createElement("div");
    item.className = "item";
    const price = Number.isFinite(purchase.price) ? `${purchase.price.toFixed(2)} EUR` : "-";
    item.innerHTML = `
      <header>
        <h3>${purchase.name} (${formatDate(purchase.date)})</h3>
        <div class="actions">
          <button class="danger" data-action="delete">Supprimer</button>
        </div>
      </header>
      <div class="tags">
        <span class="tag">Ref: ${purchase.reference || "-"}</span>
        <span class="tag">Quantite: ${purchase.quantity}</span>
        <span class="tag">Prix: ${price}</span>
      </div>
      <div class="meta">${purchase.notes ? purchase.notes : ""}</div>
    `;
    item.querySelector("button").addEventListener("click", () => deletePurchase(purchase.id));
    purchaseList.append(item);
  });
};

const renderTabs = () => {
  const order = normalizeTabOrder(data.settings.tabOrder);
  tabsContainer.innerHTML = "";
  order.forEach((tabId) => {
    const tab = TAB_DEFS.find((entry) => entry.id === tabId);
    if (!tab) return;
    const button = document.createElement("button");
    button.type = "button";
    const isRightTab = tab.id === "backup" || tab.id === "settings";
    const needsSpacer = tab.id === "backup";
    button.className = `tab${isRightTab ? " tab-right" : ""}${needsSpacer ? " tab-spacer" : ""}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", "false");
    button.dataset.tab = tab.id;
    button.innerHTML = `<span class="tab-icon">${tab.icon}</span><span>${tab.label}</span>`;
    button.addEventListener("click", () => setActiveTab(tab.id));
    tabsContainer.append(button);
  });
};

const setActiveTab = (tabId) => {
  const panels = Array.from(document.querySelectorAll(".tab-panel"));
  const tabs = Array.from(document.querySelectorAll(".tab"));
  tabs.forEach((tab) => {
    const active = tab.dataset.tab === tabId;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  panels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.tab !== tabId);
  });
  data.settings.lastTab = tabId;
  saveData(data);
};

const renderTabOrderList = () => {
  const order = normalizeTabOrder(data.settings.tabOrder);
  tabOrderList.innerHTML = "";
  order.forEach((tabId, index) => {
    const tab = TAB_DEFS.find((entry) => entry.id === tabId);
    if (!tab) return;
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <header>
        <h3>${tab.label}</h3>
        <div class="actions">
          <button class="secondary icon" data-action="up">Monter</button>
          <button class="secondary icon" data-action="down">Descendre</button>
        </div>
      </header>
    `;
    const [upBtn, downBtn] = row.querySelectorAll("button");
    upBtn.addEventListener("click", () => moveTab(tabId, -1));
    downBtn.addEventListener("click", () => moveTab(tabId, 1));
    upBtn.disabled = index === 0;
    downBtn.disabled = index === order.length - 1;
    tabOrderList.append(row);
  });
};

const moveTab = (tabId, direction) => {
  const order = normalizeTabOrder(data.settings.tabOrder);
  const index = order.indexOf(tabId);
  if (index < 0) return;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= order.length) return;
  order.splice(index, 1);
  order.splice(nextIndex, 0, tabId);
  data.settings.tabOrder = order;
  saveData(data);
  renderTabs();
  setActiveTab(data.settings.lastTab || "flights");
  renderTabOrderList();
};

const setStockFormMode = (isEditing) => {
  if (isEditing) {
    stockSubmit.textContent = "Mettre a jour la piece";
    stockCancel.classList.remove("hidden");
  } else {
    stockSubmit.textContent = "Ajouter la piece";
    stockCancel.classList.add("hidden");
  }
};

const resetStockForm = () => {
  editingStockId = null;
  stockForm.reset();
  setStockFormMode(false);
};

const startEditStock = (id) => {
  const model = getActiveModel();
  const item = model.stock.find((entry) => entry.id === id);
  if (!item) return;
  editingStockId = id;
  stockForm.name.value = item.name || "";
  stockForm.reference.value = item.reference || "";
  stockForm.quantity.value = item.quantity !== undefined && item.quantity !== null ? item.quantity : 0;
  stockForm.minimum.value = item.minimum !== undefined && item.minimum !== null ? item.minimum : 0;
  stockForm.location.value = item.location || "";
  setStockFormMode(true);
  setActiveTab("stock");
};

const duplicateStock = (id) => {
  const model = getActiveModel();
  const item = model.stock.find((entry) => entry.id === id);
  if (!item) return;
  const copy = {
    ...item,
    id: uid(),
    name: `${item.name} (copie)`
  };
  model.stock.push(copy);
  saveData(data);
  renderStock();
  startEditStock(copy.id);
};

const addFlight = (form) => {
  const model = getActiveModel();
  const payload = new FormData(form);
  const flight = {
    id: uid(),
    date: payload.get("date"),
    duration: Number(payload.get("duration")) || 0,
    batteryId: payload.get("batteryId") || "",
    notes: payload.get("notes").trim()
  };
  model.flights.push(flight);

  if (flight.batteryId) {
    const battery = model.batteries.find((entry) => entry.id === flight.batteryId);
    if (battery) {
      battery.cycles = (battery.cycles || 0) + 1;
      battery.lastUsed = flight.date;
    }
  }

  saveData(data);
  form.reset();
  renderAll();
};

const deleteFlight = (id) => {
  const model = getActiveModel();
  model.flights = model.flights.filter((flight) => flight.id !== id);
  saveData(data);
  renderAll();
};

const addBattery = (form) => {
  const model = getActiveModel();
  const payload = new FormData(form);
  const cells = Number(payload.get("cells")) || null;
  const battery = {
    id: uid(),
    name: payload.get("name").trim(),
    number: payload.get("number").trim(),
    capacity: Number(payload.get("capacity")) || null,
    dischargeRate: Number(payload.get("dischargeRate")) || null,
    cells,
    voltage: cells ? voltageFromCells(cells) : null,
    notes: payload.get("notes").trim(),
    cycles: 0,
    lastUsed: null
  };
  model.batteries.push(battery);
  saveData(data);
  form.reset();
  renderAll();
};

const incrementCycle = (id) => {
  const model = getActiveModel();
  const battery = model.batteries.find((entry) => entry.id === id);
  if (!battery) return;
  battery.cycles = (battery.cycles || 0) + 1;
  battery.lastUsed = new Date().toISOString().slice(0, 10);
  saveData(data);
  renderAll();
};

const deleteBattery = (id) => {
  const model = getActiveModel();
  model.batteries = model.batteries.filter((battery) => battery.id !== id);
  model.flights = model.flights.map((flight) => ({
    ...flight,
    batteryId: flight.batteryId === id ? "" : flight.batteryId
  }));
  saveData(data);
  renderAll();
};

const duplicateBattery = (id) => {
  const model = getActiveModel();
  const battery = model.batteries.find((entry) => entry.id === id);
  if (!battery) return;
  if (!batteryForm) return;
  batteryForm.name.value = battery.name ? `${battery.name} (copie)` : "";
  batteryForm.number.value = battery.number || "";
  batteryForm.capacity.value = battery.capacity ?? "";
  batteryForm.dischargeRate.value = battery.dischargeRate ?? "";
  batteryForm.cells.value = battery.cells ?? "";
  batteryForm.notes.value = battery.notes || "";
  updateBatteryVoltageField();
  setActiveTab("batteries");
  batteryForm.scrollIntoView({ behavior: "smooth", block: "start" });
};

const addMaintenance = (form) => {
  const model = getActiveModel();
  const payload = new FormData(form);
  const task = {
    id: uid(),
    title: payload.get("title").trim(),
    intervalDays: Number(payload.get("intervalDays")) || 0,
    intervalFlights: Number(payload.get("intervalFlights")) || 0,
    notes: payload.get("notes").trim(),
    lastDoneDate: null,
    lastDoneFlights: 0
  };
  model.maintenance.push(task);
  saveData(data);
  form.reset();
  renderAll();
};

const markMaintenanceDone = (id) => {
  const model = getActiveModel();
  const task = model.maintenance.find((entry) => entry.id === id);
  if (!task) return;
  task.lastDoneDate = new Date().toISOString().slice(0, 10);
  task.lastDoneFlights = model.flights.length;
  saveData(data);
  renderAll();
};

const deleteMaintenance = (id) => {
  const model = getActiveModel();
  model.maintenance = model.maintenance.filter((task) => task.id !== id);
  saveData(data);
  renderAll();
};

const addOrUpdateStock = (form) => {
  const model = getActiveModel();
  const payload = new FormData(form);
  const next = {
    name: payload.get("name").trim(),
    reference: payload.get("reference").trim(),
    quantity: Number(payload.get("quantity")) || 0,
    minimum: Number(payload.get("minimum")) || 0,
    location: payload.get("location").trim()
  };

  if (editingStockId) {
    const current = model.stock.find((item) => item.id === editingStockId);
    if (current) {
      Object.assign(current, next);
    }
  } else {
    model.stock.push({ id: uid(), ...next });
  }

  saveData(data);
  resetStockForm();
  renderStock();
};

const deleteStock = (id) => {
  const model = getActiveModel();
  model.stock = model.stock.filter((item) => item.id !== id);
  if (editingStockId === id) {
    resetStockForm();
  }
  saveData(data);
  renderStock();
};

const addPurchase = (form) => {
  const model = getActiveModel();
  const payload = new FormData(form);
  const purchase = {
    id: uid(),
    date: payload.get("date"),
    name: payload.get("name").trim(),
    reference: payload.get("reference").trim(),
    quantity: Number(payload.get("quantity")) || 1,
    price: payload.get("price") ? Number(payload.get("price")) : null,
    notes: payload.get("notes").trim()
  };
  model.purchases.push(purchase);
  saveData(data);
  form.reset();
  renderPurchases();
};

const deletePurchase = (id) => {
  const model = getActiveModel();
  model.purchases = model.purchases.filter((item) => item.id !== id);
  saveData(data);
  renderPurchases();
};

const exportData = () => {
  const fileName = "align-trex-150-dfc.json";
  const payload = JSON.stringify(data, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
};

const importData = (file) => {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const nextData = normalizeImported(parsed);
      const confirmReplace = confirm("Importer ces donnees va remplacer les donnees actuelles. Continuer ?");
      if (!confirmReplace) return;
      data = nextData;
      saveData(data);
      applyThemeColor(getActiveModel().themeColor);
      resetStockForm();
      renderAll();
      renderTabs();
      setActiveTab(data.settings.lastTab || "flights");
      importStatus.textContent = "Import termine.";
    } catch (error) {
      importStatus.textContent = "Import impossible: fichier invalide.";
    }
  };
  reader.readAsText(file);
};

const hexToRgb = (hex) => {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  const value = parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const darken = (hex, amount) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = clamp(Math.round(rgb.r * (1 - amount)), 0, 255);
  const g = clamp(Math.round(rgb.g * (1 - amount)), 0, 255);
  const b = clamp(Math.round(rgb.b * (1 - amount)), 0, 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

const applyThemeColor = (color) => {
  if (!color) return;
  document.documentElement.style.setProperty("--accent", color);
  document.documentElement.style.setProperty("--accent-dark", darken(color, 0.25));
  if (themeColorInput) {
    themeColorInput.value = color;
  }
};

const setThemeColor = (color) => {
  const model = getActiveModel();
  model.themeColor = color;
  saveData(data);
  applyThemeColor(color);
  renderModelList();
};

const renderThemePresets = () => {
  themePresets.innerHTML = "";
  THEME_PRESETS.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-button";
    button.innerHTML = `<span class="preset-swatch" style="background:${preset.color}"></span>${preset.name}`;
    button.addEventListener("click", () => setThemeColor(preset.color));
    themePresets.append(button);
  });
};

const setActiveModel = (id) => {
  if (!data.models.find((model) => model.id === id)) return;
  data.activeModelId = id;
  saveData(data);
  applyThemeColor(getActiveModel().themeColor);
  updateHeader();
  renderModelSelector();
  resetStockForm();
  renderAll();
  renderModelList();
};

const renderModelSelector = () => {
  if (!modelSelect) return;
  modelSelect.innerHTML = "";
  data.models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = model.name;
    modelSelect.append(option);
  });
  modelSelect.value = data.activeModelId || "";
};

const renderModelList = () => {
  modelList.innerHTML = "";
  data.models.forEach((model) => {
    const isActive = model.id === data.activeModelId;
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <header>
        <h3>${model.name}</h3>
        <div class="actions">
          <button class="secondary" data-action="activate">${isActive ? "Actif" : "Activer"}</button>
          <button class="secondary" data-action="rename">Renommer</button>
          <button class="danger" data-action="delete">Supprimer</button>
        </div>
      </header>
      <div class="tags">
        <span class="tag">Couleur: ${model.themeColor}</span>
      </div>
    `;
    const [activateBtn, renameBtn, deleteBtn] = item.querySelectorAll("button");
    activateBtn.disabled = isActive;
    activateBtn.addEventListener("click", () => setActiveModel(model.id));
    renameBtn.addEventListener("click", () => renameModel(model.id));
    deleteBtn.addEventListener("click", () => deleteModel(model.id));
    modelList.append(item);
  });
};

const addModel = (form) => {
  const payload = new FormData(form);
  const name = payload.get("name").trim();
  const color = payload.get("color").trim() || DEFAULT_THEME;
  if (!name) return;
  const model = createModel(name, color);
  data.models.push(model);
  data.activeModelId = model.id;
  saveData(data);
  form.reset();
  form.color.value = color;
  applyThemeColor(color);
  updateHeader();
  renderAll();
  renderModelList();
};

const renameModel = (id) => {
  const model = data.models.find((entry) => entry.id === id);
  if (!model) return;
  const nextName = prompt("Nouveau nom du modele", model.name);
  if (!nextName) return;
  model.name = nextName.trim();
  saveData(data);
  updateHeader();
  renderModelList();
};

const deleteModel = (id) => {
  if (data.models.length <= 1) {
    alert("Impossible de supprimer le dernier modele.");
    return;
  }
  const model = data.models.find((entry) => entry.id === id);
  if (!model) return;
  const confirmDelete = confirm(`Supprimer le modele ${model.name} ?`);
  if (!confirmDelete) return;
  data.models = data.models.filter((entry) => entry.id !== id);
  if (data.activeModelId === id) {
    data.activeModelId = data.models[0].id;
  }
  saveData(data);
  applyThemeColor(getActiveModel().themeColor);
  updateHeader();
  renderAll();
  renderModelList();
};

const renderAll = () => {
  updateHeader();
  renderModelSelector();
  updateStats();
  renderBatteryOptions();
  renderFlights();
  renderBatteries();
  renderMaintenance();
  renderStock();
  renderPurchases();
  renderTabOrderList();
};

flightForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addFlight(event.target);
});

batteryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addBattery(event.target);
});

maintenanceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addMaintenance(event.target);
});

stockForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addOrUpdateStock(event.target);
});

stockCancel.addEventListener("click", () => {
  resetStockForm();
});

stockSortKey.addEventListener("change", (event) => {
  data.settings.stockSort.key = event.target.value;
  saveData(data);
  renderStock();
});

stockSortDir.addEventListener("change", (event) => {
  data.settings.stockSort.dir = event.target.value;
  saveData(data);
  renderStock();
});

const handleBatterySortChange = (event) => {
  const [key, dir] = event.target.value.split("-");
  data.settings.stockBatterySort = { key, dir };
  saveData(data);
  syncBatterySortControls();
  renderBatteries();
  renderStockBatteries();
};

const handleBatteryPlacementChange = (event) => {
  data.settings.stockBatteryNumberPlacement = event.target.value;
  saveData(data);
  syncBatterySortControls();
  renderBatteries();
  renderStockBatteries();
};

if (stockBatterySort) {
  stockBatterySort.addEventListener("change", handleBatterySortChange);
}

if (batterySortKey) {
  batterySortKey.addEventListener("change", handleBatterySortChange);
}

if (stockBatteryNumberPlacement) {
  stockBatteryNumberPlacement.addEventListener("change", handleBatteryPlacementChange);
}

if (batteryNumberPlacement) {
  batteryNumberPlacement.addEventListener("change", handleBatteryPlacementChange);
}

purchaseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addPurchase(event.target);
});

exportBtn.addEventListener("click", () => {
  exportData();
});

importBtn.addEventListener("click", () => {
  importFile.click();
});

importFile.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  importData(file);
  event.target.value = "";
});

themeColorInput.addEventListener("input", (event) => {
  setThemeColor(event.target.value);
});

themeResetBtn.addEventListener("click", () => {
  setThemeColor(DEFAULT_THEME);
});

modelForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addModel(event.target);
});

if (modelSelect) {
  modelSelect.addEventListener("change", (event) => {
    setActiveModel(event.target.value);
  });
}

const updateBatteryVoltageField = () => {
  if (!batteryForm || !batteryForm.cells || !batteryForm.voltage) return;
  const value = voltageFromCells(batteryForm.cells.value);
  batteryForm.voltage.value = Number.isFinite(value) ? value : "";
};

if (batteryForm && batteryForm.cells) {
  batteryForm.cells.addEventListener("input", updateBatteryVoltageField);
}

const init = () => {
  applyThemeColor(getActiveModel().themeColor);
  renderTabs();
  renderThemePresets();
  renderAll();
  const lastTab = data.settings.lastTab || "flights";
  setActiveTab(lastTab);
  stockSortKey.value = getStockSort().key;
  stockSortDir.value = getStockSort().dir;
  syncBatterySortControls();
  updateBatteryVoltageField();
};

init();











