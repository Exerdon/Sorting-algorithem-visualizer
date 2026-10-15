const $ = (id) => document.getElementById(id);

const barsEl = $("bars");
const algorithmEl = $("algorithm");
const sizeEl = $("size");
const speedEl = $("speed");
const startBtn = $("start");
const pauseBtn = $("pause");
const resetBtn = $("reset");
const shuffleBtn = $("shuffle");

const names = {
  bubble: "Bubble Sort",
  selection: "Selection Sort",
  insertion: "Insertion Sort",
  merge: "Merge Sort",
  quick: "Quick Sort",
  heap: "Heap Sort"
};

const complexity = {
  bubble: "O(n²)",
  selection: "O(n²)",
  insertion: "O(n²)",
  merge: "O(n log n)",
  quick: "O(n log n)",
  heap: "O(n log n)"
};

let values = [];
let originalValues = [];
let comparisons = 0;
let moves = 0;
let runId = 0;
let running = false;
let paused = false;
let finished = false;
let pauseWaiters = [];
let timerId = null;

function makeArray(size) {
  return Array.from({ length: size }, () => Math.floor(Math.random() * 96) + 4);
}

function updateMetrics() {
  $("comparisons").textContent = comparisons;
  $("moves").textContent = moves;
  $("arraySize").textContent = values.length;
  $("complexity").textContent = complexity[algorithmEl.value];
}

function setStatus(message) {
  $("status").textContent = message;
}

function getDelay() {
  // 100% = fast; 1% = slow.
  return Math.round(850 * (1 - Number(speedEl.value) / 100)) + 12;
}

function renderBars(highlights = {}, sortedIndices = []) {
  const sorted = new Set(sortedIndices);
  const { comparing = [], swapping = [], pivot = [] } = highlights;
  const compareSet = new Set(comparing);
  const swapSet = new Set(swapping);
  const pivotSet = new Set(pivot);
  const fragment = document.createDocumentFragment();

  values.forEach((value, index) => {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${value}%`;
    bar.title = `Index ${index}: ${value}`;

    if (sorted.has(index)) bar.classList.add("sorted");
    else if (swapSet.has(index)) bar.classList.add("swapping");
    else if (pivotSet.has(index)) bar.classList.add("pivot");
    else if (compareSet.has(index)) bar.classList.add("comparing");

    fragment.appendChild(bar);
  });

  barsEl.replaceChildren(fragment);
}

function updateAlgorithmCard() {
  const key = algorithmEl.value;
  $("visualTitle").textContent = names[key];
  $("complexity").textContent = complexity[key];
  document.querySelectorAll(".algo-card").forEach(card => {
    card.classList.toggle("active", card.dataset.card === key);
  });
}

function resetCounters() {
  comparisons = 0;
  moves = 0;
  updateMetrics();
}

function newArray() {
  cancelRun();
  values = makeArray(Number(sizeEl.value));
  originalValues = [...values];
  resetCounters();
  renderBars();
  updateAlgorithmCard();
  setStatus("Ready — press Start to begin.");
  $("start").disabled = false;
  $("pause").disabled = true;
  $("pause").textContent = "Ⅱ Pause";
}

function cancelRun() {
  runId++;
  running = false;
  paused = false;
  finished = false;
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
  pauseWaiters.splice(0).forEach(resolve => resolve());
}

function waitIfPaused(id) {
  if (id !== runId) return Promise.resolve(false);
  if (!paused) return Promise.resolve(true);

  return new Promise(resolve => {
    pauseWaiters.push(() => resolve(id === runId));
  });
}

async function step(id, highlights = {}, sorted = [], message = "") {
  if (id !== runId) return false;
  if (!(await waitIfPaused(id))) return false;
  if (id !== runId) return false;

  renderBars(highlights, sorted);
  if (message) setStatus(message);

  await new Promise(resolve => {
    timerId = setTimeout(() => {
      timerId = null;
      resolve();
    }, getDelay());
  });

  if (id !== runId) return false;
  return waitIfPaused(id);
}

function compareCount() {
  comparisons++;
  updateMetrics();
}

function moveCount(amount = 1) {
  moves += amount;
  updateMetrics();
}

// Algorithms are async generators of visual steps. All six use the same
// renderer, pause mechanism, speed control, and operation counters.
async function bubbleSort(id) {
  const n = values.length;
  const sorted = [];
  for (let end = n - 1; end > 0; end--) {
    let changed = false;
    for (let j = 0; j < end; j++) {
      compareCount();
      if (!(await step(id, { comparing: [j, j + 1] }, sorted,
        `Compare ${values[j]} and ${values[j + 1]}.`))) return false;
      if (values[j] > values[j + 1]) {
        [values[j], values[j + 1]] = [values[j + 1], values[j]];
        moveCount(2);
        changed = true;
        if (!(await step(id, { swapping: [j, j + 1] }, sorted,
          `Swap the pair: ${values[j]} and ${values[j + 1]}.`))) return false;
      }
    }
    sorted.push(end);
    if (!(await step(id, {}, sorted, `Pass complete. Index ${end} is sorted.`))) return false;
    if (!changed) break;
  }
  return true;
}

async function selectionSort(id) {
  const n = values.length;
  const sorted = [];
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      compareCount();
      if (!(await step(id, { comparing: [min, j] }, sorted,
        `Looking for the minimum from index ${i}; current minimum is ${values[min]}.`))) return false;
      if (values[j] < values[min]) min = j;
    }
    if (min !== i) {
      [values[i], values[min]] = [values[min], values[i]];
      moveCount(2);
      if (!(await step(id, { swapping: [i, min] }, sorted,
        `Place minimum value ${values[i]} at index ${i}.`))) return false;
    }
    sorted.push(i);
  }
  return true;
}

async function insertionSort(id) {
  const n = values.length;
  const sorted = [0];
  for (let i = 1; i < n; i++) {
    const key = values[i];
    let j = i - 1;
    if (!(await step(id, { pivot: [i] }, sorted,
      `Pick ${key} as the key and find its insertion position.`))) return false;

    while (j >= 0) {
      compareCount();
      if (!(await step(id, { comparing: [j, j + 1] }, sorted,
        `Compare ${values[j]} with key ${key}.`))) return false;
      if (values[j] <= key) break;
      values[j + 1] = values[j];
      moveCount();
      if (!(await step(id, { swapping: [j, j + 1] }, sorted,
        `Shift ${values[j]} one position to the right.`))) return false;
      j--;
    }
    values[j + 1] = key;
    moveCount();
    sorted.push(i);
    if (!(await step(id, {}, sorted, `Insert ${key} at index ${j + 1}.`))) return false;
  }
  return true;
}

async function mergeSort(id) {
  const n = values.length;
  async function merge(left, mid, right) {
    const a = values.slice(left, mid + 1);
    const b = values.slice(mid + 1, right + 1);
    let i = 0, j = 0, k = left;

    while (i < a.length && j < b.length) {
      compareCount();
      if (!(await step(id, { comparing: [left + i, mid + 1 + j] }, [],
        `Merge: compare ${a[i]} and ${b[j]}.`))) return false;

      if (a[i] <= b[j]) values[k] = a[i++];
      else values[k] = b[j++];
      moveCount();
      if (!(await step(id, { swapping: [k] }, [],
        `Write the next smallest value at index ${k}.`))) return false;
      k++;
    }
    while (i < a.length) {
      values[k] = a[i++];
      moveCount();
      if (!(await step(id, { swapping: [k] }, [], `Copy remaining value into index ${k}.`))) return false;
      k++;
    }
    while (j < b.length) {
      values[k] = b[j++];
      moveCount();
      if (!(await step(id, { swapping: [k] }, [], `Copy remaining value into index ${k}.`))) return false;
      k++;
    }
    return true;
  }

  async function divide(left, right) {
    if (left >= right) return true;
    const mid = Math.floor((left + right) / 2);
    if (!(await step(id, { pivot: [mid] }, [], `Divide the section from index ${left} to ${right}.`))) return false;
    if (!(await divide(left, mid))) return false;
    if (!(await divide(mid + 1, right))) return false;
    return merge(left, mid, right);
  }
  return divide(0, n - 1);
}

async function quickSort(id) {
  async function partition(low, high) {
    const pivotValue = values[high];
    let i = low;
    for (let j = low; j < high; j++) {
      compareCount();
      if (!(await step(id, { comparing: [j], pivot: [high] }, [],
        `Compare ${values[j]} with pivot ${pivotValue}.`))) return null;
      if (values[j] < pivotValue) {
        if (i !== j) {
          [values[i], values[j]] = [values[j], values[i]];
          moveCount(2);
          if (!(await step(id, { swapping: [i, j], pivot: [high] }, [],
            `Move ${values[i]} to the pivot's left side.`))) return null;
        }
        i++;
      }
    }
    [values[i], values[high]] = [values[high], values[i]];
    moveCount(2);
    if (!(await step(id, { swapping: [i, high] }, [i],
      `Pivot ${pivotValue} is now in its partition position.`))) return null;
    return i;
  }

  async function sort(low, high) {
    if (low >= high) return true;
    const p = await partition(low, high);
    if (p === null) return false;
    if (!(await sort(low, p - 1))) return false;
    return sort(p + 1, high);
  }
  return sort(0, values.length - 1);
}

async function heapSort(id) {
  const n = values.length;
  async function siftDown(size, root) {
    let largest = root;
    while (true) {
      const left = 2 * root + 1;
      const right = left + 1;
      largest = root;

      if (left < size) {
        compareCount();
        if (!(await step(id, { comparing: [largest, left] }, [],
          `Compare parent ${values[largest]} with left child ${values[left]}.`))) return false;
        if (values[left] > values[largest]) largest = left;
      }
      if (right < size) {
        compareCount();
        if (!(await step(id, { comparing: [largest, right] }, [],
          `Compare current largest with right child ${values[right]}.`))) return false;
        if (values[right] > values[largest]) largest = right;
      }
      if (largest === root) return true;

      [values[root], values[largest]] = [values[largest], values[root]];
      moveCount(2);
      if (!(await step(id, { swapping: [root, largest] }, [],
        `Restore the heap by swapping ${values[largest]} and ${values[root]}.`))) return false;
      root = largest;
    }
  }

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    if (!(await siftDown(n, i))) return false;
  }

  const sorted = [];
  for (let end = n - 1; end > 0; end--) {
    [values[0], values[end]] = [values[end], values[0]];
    moveCount(2);
    sorted.push(end);
    if (!(await step(id, { swapping: [0, end] }, sorted,
      `Move the maximum value ${values[end]} to its final position.`))) return false;
    if (!(await siftDown(end, 0))) return false;
  }
  return true;
}

const algorithms = {
  bubble: bubbleSort,
  selection: selectionSort,
  insertion: insertionSort,
  merge: mergeSort,
  quick: quickSort,
  heap: heapSort
};

async function startSort() {
  if (running || finished) return;
  running = true;
  paused = false;
  const id = ++runId;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  pauseBtn.textContent = "Ⅱ Pause";
  setStatus(`${names[algorithmEl.value]} running…`);

  try {
    const ok = await algorithms[algorithmEl.value](id);
    if (!ok || id !== runId) return;
    renderBars({}, values.map((_, index) => index));
    finished = true;
    setStatus("Complete — array is sorted!");
  } catch (error) {
    console.error(error);
    if (id === runId) setStatus("Something went wrong. Reset and try again.");
  } finally {
    if (id === runId) {
      running = false;
      paused = false;
      startBtn.disabled = finished;
      pauseBtn.disabled = true;
      pauseBtn.textContent = "Ⅱ Pause";
    }
  }
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  pauseBtn.textContent = paused ? "▶ Resume" : "Ⅱ Pause";
  setStatus(paused ? "Paused — press Resume to continue." : `${names[algorithmEl.value]} running…`);
  if (!paused) pauseWaiters.splice(0).forEach(resolve => resolve());
}

function resetCurrent() {
  cancelRun();
  values = [...originalValues];
  resetCounters();
  renderBars();
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  pauseBtn.textContent = "Ⅱ Pause";
  setStatus("Reset — ready to sort again.");
}

startBtn.addEventListener("click", startSort);
pauseBtn.addEventListener("click", togglePause);
resetBtn.addEventListener("click", resetCurrent);
shuffleBtn.addEventListener("click", newArray);

algorithmEl.addEventListener("change", () => {
  if (running) cancelRun();
  updateAlgorithmCard();
  resetCurrent();
  setStatus(`${names[algorithmEl.value]} selected — press Start.`);
});

sizeEl.addEventListener("input", () => {
  $("sizeLabel").textContent = sizeEl.value;
});
sizeEl.addEventListener("change", newArray);

speedEl.addEventListener("input", () => {
  $("speedLabel").textContent = `${speedEl.value}%`;
});

document.querySelectorAll(".algo-card").forEach(card => {
  card.addEventListener("click", () => {
    algorithmEl.value = card.dataset.card;
    if (running) cancelRun();
    updateAlgorithmCard();
    resetCurrent();
    setStatus(`${names[algorithmEl.value]} selected — press Start.`);
  });
});

newArray();
$("sizeLabel").textContent = sizeEl.value;
$("speedLabel").textContent = `${speedEl.value}%`;
