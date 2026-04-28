function getPinoutData() {
  const dataEl = document.getElementById("lab-pinout-data");
  if (!dataEl) return { esp32Label: "ESP32-WROOM", components: {} };

  try {
    const parsed = JSON.parse(dataEl.textContent || "{}");
    if (!parsed || typeof parsed !== "object") {
      return { esp32Label: "ESP32-WROOM", components: {} };
    }
    return {
      esp32Label: parsed.esp32Label || "ESP32-WROOM",
      components: parsed.components && typeof parsed.components === "object" ? parsed.components : {}
    };
  } catch (err) {
    console.error("Failed to parse lab pinout data from HTML:", err);
    return { esp32Label: "ESP32-WROOM", components: {} };
  }
}

const LAB_PINOUT = getPinoutData();
const LAB_COMPONENTS = LAB_PINOUT.components;

function getLabQuizData() {
  const dataEl = document.getElementById("lab-quiz-data");
  if (!dataEl) return [];

  try {
    const parsed = JSON.parse(dataEl.textContent || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to parse lab quiz data from HTML:", err);
    return [];
  }
}

const LAB_QUIZ = getLabQuizData();

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.classList.toggle("open");
}

function initScrollSpy() {
  const sections = document.querySelectorAll(".topic-section[id]");
  const navItems = document.querySelectorAll(".nav-item[data-section]");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        navItems.forEach((item) => {
          item.classList.toggle("active", item.dataset.section === id);
        });
      }
    });
  }, { rootMargin: "-20% 0px -70% 0px" });

  sections.forEach((s) => observer.observe(s));
}

function initComponentPicker() {
  const box = document.getElementById("component-buttons");
  const explain = document.getElementById("path-explain");
  if (!box || !explain) return;

  Object.entries(LAB_COMPONENTS).forEach(([key, item]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = item.label;
    b.addEventListener("click", () => selectComponent(key, b));
    box.appendChild(b);
  });

  const first = box.querySelector("button");
  if (first) {
    const firstKey = Object.keys(LAB_COMPONENTS)[0];
    if (firstKey) selectComponent(firstKey, first);
  }
}

function padRight(value, width) {
  const text = String(value || "");
  return text.length >= width ? text.slice(0, width) : text + " ".repeat(width - text.length);
}

function centerText(value, width) {
  const text = String(value || "");
  if (text.length >= width) return text.slice(0, width);
  const left = Math.floor((width - text.length) / 2);
  const right = width - text.length - left;
  return " ".repeat(left) + text + " ".repeat(right);
}

function makePinRow(pin, width) {
  const left = padRight(pin.esp, 12);
  const middle = padRight("ESP32", 7);
  const right = padRight(pin.module, 24);
  const content = `|${left} ${middle} ${right}|`;
  const tail = `-- ${pin.trace || "|--direct--UNSPECIFIED"}`;
  const row = `--${content}${tail}`;
  return row.length >= width ? row.slice(0, width) : row + " ".repeat(width - row.length);
}

function classifyPin(componentKey, pin) {
  const esp = String(pin.esp || "").toUpperCase();
  const module = String(pin.module || "").toUpperCase();
  const trace = String(pin.trace || "").toUpperCase();

  if (esp.includes("GND") || module.includes("GND") || trace.includes("GND_RETURN") || trace.includes("BAT-") || trace.includes("GROUND")) {
    return "GND";
  }

  if (componentKey === "speaker") return module.includes("VDD") || module.includes("3V3") ? "IN" : "OUT";
  if (componentKey === "leds") return module.includes("3V3") ? "IN" : "OUT";
  if (componentKey === "prog") return esp.includes("RX") || esp.includes("EN") || esp.includes("IO0") ? "IN" : "OUT";
  if (componentKey === "spi") return "OUT";
  if (componentKey === "usb3" || componentKey === "usbc" || componentKey === "battery") return "IN";

  return "IN";
}

function renderBoxHeader(label, width) {
  const innerWidth = width - 2;
  return [
    "+" + "-".repeat(innerWidth) + "+",
    "|" + centerText(label, innerWidth) + "|",
    "+" + "-".repeat(innerWidth) + "+"
  ];
}

function renderPinGroup(groupName, pins, width) {
  const lines = [];
  const innerWidth = width - 2;
  lines.push("|" + centerText(groupName, innerWidth) + "|");
  lines.push("|" + " ".repeat(innerWidth) + "|");

  pins.forEach((pin) => {
    lines.push(makePinRow(pin, width));
  });

  lines.push("+" + "-".repeat(innerWidth) + "+");
  return lines;
}

function renderAsciiSchematic(componentKey, component) {
  const container = document.getElementById("ascii-schematic");
  const notes = document.getElementById("ascii-notes");
  if (!container) return;

  const lines = [];
  const title = `${component.label} Path Map`;
  const boxWidth = 76;
  const innerWidth = boxWidth - 2;
  const groupedPins = (component.pins || []).reduce((acc, pin) => {
    const group = classifyPin(componentKey, pin);
    if (!acc[group]) acc[group] = [];
    acc[group].push(pin);
    return acc;
  }, { IN: [], OUT: [], GND: [] });

  lines.push(...renderBoxHeader(title, boxWidth));
  lines.push("|" + centerText(`${LAB_PINOUT.esp32Label}  <->  ${componentKey.toUpperCase()}`, innerWidth) + "|");
  lines.push("+" + "-".repeat(innerWidth) + "+");

  ["IN", "OUT", "GND"].forEach((groupName) => {
    if (!groupedPins[groupName].length) return;
    lines.push(...renderPinGroup(groupName, groupedPins[groupName], boxWidth));
  });

  lines.push("|" + centerText("RETURN PATH -> GND PLANE", innerWidth) + "|");
  lines.push("+" + "-".repeat(innerWidth) + "+");
  container.textContent = lines.join("\n");

  if (notes) {
    const noteItems = (component.notes || []).map((item) => `<li>${item}</li>`).join("");
    notes.innerHTML = `<strong>Trace Interpretation Notes</strong><ul>${noteItems || "<li>No notes provided.</li>"}</ul>`;
  }
}

function selectComponent(key, buttonEl) {
  const component = LAB_COMPONENTS[key];
  if (!component) return;

  document.querySelectorAll(".component-buttons button").forEach((b) => {
    b.classList.toggle("active", b === buttonEl);
  });

  const explain = document.getElementById("path-explain");
  if (explain) {
    explain.innerHTML = `<strong>${component.label}</strong><br>${component.desc}`;
  }

  renderAsciiSchematic(key, component);
}

function initScenarioControls() {
  const ids = ["src-select", "pot-level", "led-count", "sd-present", "speaker-on", "mic-on"];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", updateScenario);
    if (el) el.addEventListener("change", updateScenario);
  });

  document.querySelectorAll(".btn-state").forEach((el) => {
    el.addEventListener("change", updateScenario);
  });

  updateScenario();
}

function updateScenario() {
  const source = (document.getElementById("src-select") || {}).value || "usb3";
  const pot = parseInt((document.getElementById("pot-level") || {}).value || "0", 10);
  const ledCount = parseInt((document.getElementById("led-count") || {}).value || "0", 10);
  const sdOn = !!((document.getElementById("sd-present") || {}).checked);
  const spkOn = !!((document.getElementById("speaker-on") || {}).checked);
  const micOn = !!((document.getElementById("mic-on") || {}).checked);

  const pressedButtons = Array.from(document.querySelectorAll(".btn-state:checked")).map((el) => el.value);

  const basemA = 80;
  const ledmA = ledCount * 6;
  const sdmA = sdOn ? 45 : 0;
  const spkmA = spkOn ? 120 : 0;
  const micmA = micOn ? 3 : 0;
  const totalmA = basemA + ledmA + sdmA + spkmA + micmA;

  const sourceScale = source === "battery" ? 0.97 : 1.0;
  const railV = +(3.3 * sourceScale).toFixed(2);
  const powerW = +(railV * (totalmA / 1000)).toFixed(3);
  const adcV = +(3.3 * (pot / 100)).toFixed(2);

  const output = document.getElementById("scenario-output");
  if (output) {
    output.innerHTML = [
      `3V3 rail: ${railV} V`,
      `Total load: ${totalmA} mA`,
      `Estimated rail power: ${powerW} W`,
      `Pot wiper (ADC): ${adcV} V`,
      `Pressed buttons: ${pressedButtons.length ? pressedButtons.join(", ") : "none"}`
    ].join("<br>");
  }

  const notes = [];
  if (totalmA > 320) notes.push("High-load state: increased droop risk on 3V3, check regulator headroom.");
  if (sdOn && spkOn) notes.push("Concurrent SD + speaker activity can inject burst noise; prioritize decoupling and ground layout.");
  if (source === "battery") notes.push("Battery mode can have lower effective rail margin during transient peaks.");
  if (pressedButtons.length > 2) notes.push("Multiple simultaneous button events may need debounce filtering to avoid false transitions.");
  if (notes.length === 0) notes.push("Operating point is nominal. Review return paths for robust behavior as load grows.");

  const notesBox = document.getElementById("scenario-notes");
  if (notesBox) {
    notesBox.innerHTML = `<strong>Engineering Notes</strong>${notes.join("<br>")}`;
  }
}

function renderQuiz() {
  const container = document.getElementById("quiz-lab");
  if (!container) return;

  LAB_QUIZ.forEach((q, qi) => {
    const qDiv = document.createElement("div");
    qDiv.className = "quiz-q";

    const opts = q.opts.map((opt, oi) => {
      return `<label class="quiz-option" id="lab-opt-${qi}-${oi}"><input type="radio" name="lab-q-${qi}" value="${oi}" />${opt}</label>`;
    }).join("");

    qDiv.innerHTML = `
      <p>Q${qi + 1}. ${q.q}</p>
      <div class="quiz-options">${opts}</div>
      <div class="q-exp" id="lab-exp-${qi}" style="display:none; margin-top:8px; padding:8px 12px; background:rgba(240,165,0,0.07); border-left:3px solid #f0a500; font-size:12px; color:#c8d0e0; border-radius:0 3px 3px 0;"></div>
    `;

    container.appendChild(qDiv);
  });
}

function checkQuiz() {
  let correct = 0;

  LAB_QUIZ.forEach((q, qi) => {
    const selected = document.querySelector(`input[name="lab-q-${qi}"]:checked`);

    q.opts.forEach((_, oi) => {
      const label = document.getElementById(`lab-opt-${qi}-${oi}`);
      if (!label) return;

      label.classList.remove("correct-ans", "wrong-ans");
      if (oi === q.ans) {
        label.classList.add("correct-ans");
      } else if (selected && parseInt(selected.value, 10) === oi) {
        label.classList.add("wrong-ans");
      }

      const radio = label.querySelector("input");
      if (radio) radio.disabled = true;
    });

    const exp = document.getElementById(`lab-exp-${qi}`);
    if (exp) {
      exp.style.display = "block";
      exp.textContent = `→ ${q.exp}`;
    }

    if (selected && parseInt(selected.value, 10) === q.ans) correct++;
  });

  const pct = Math.round((correct / LAB_QUIZ.length) * 100);
  const result = document.getElementById("result-lab");
  if (result) {
    result.textContent = `Score: ${correct}/${LAB_QUIZ.length} (${pct}%) ${pct >= 80 ? "— Excellent systems reasoning." : pct >= 60 ? "— Good progress, revisit path details." : "— Rework rail/path analysis and retest scenarios."}`;
    result.className = `quiz-result ${pct >= 70 ? "pass" : "fail"}`;
  }

  const fill = document.getElementById("progress-fill");
  const label = document.getElementById("pct");
  if (fill) fill.style.width = `${pct}%`;
  if (label) label.textContent = `${pct}%`;

  const btn = document.getElementById("check-lab");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Checked ✓";
    btn.style.opacity = "0.5";
    btn.style.cursor = "default";
  }
}

document.addEventListener("click", (e) => {
  const link = e.target.closest(".nav-item");
  if (link && window.innerWidth <= 768) {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.remove("open");
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.remove("open");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  initScrollSpy();
  initComponentPicker();
  initScenarioControls();
  renderQuiz();

  const btn = document.getElementById("check-lab");
  if (btn) btn.addEventListener("click", checkQuiz);
});
