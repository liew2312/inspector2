// State Management
let appData = { projects: [] };
let currentProjectId = null;
let currentPlotId = null;
let currentWorksheetId = null;

// Signature Pad Instances
let sigPadSE = null;
let sigPadCustomer = null;

// Loaded Base64 temporary image
let currentDefectPhotoBase64 = "";

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
    loadDataFromStorage();
    renderProjects();
    setupSignaturePads();
    setupImageUpload();

    // Back Button Handler
    document.getElementById("backBtn").addEventListener("click", handleBackNavigation);
});

// Load & Save to LocalStorage (Offline Persistence)
function loadDataFromStorage() {
    const savedData = localStorage.getItem("inspect_pro_data");
    if (savedData) {
        try {
            appData = JSON.parse(savedData);
        } catch (e) {
            console.error("Error parsing localstorage data", e);
        }
    } else {
        // Seed some demo data if empty
        appData = { projects: [] };
        saveToStorage();
    }
}

function saveToStorage() {
    localStorage.setItem("inspect_pro_data", JSON.stringify(appData));
}

// Navigation Engine (Simple SPA View Switcher)
function switchView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.style.display = "none");
    document.getElementById(viewId).style.display = "block";
    
    const backBtn = document.getElementById("backBtn");
    if (viewId === "view-projects") {
        backBtn.style.display = "none";
        document.getElementById("appTitle").innerHTML = "Inspect<span class='accent'>Pro</span>";
    } else {
        backBtn.style.display = "table-cell";
    }
}

function handleBackNavigation() {
    const vProjects = document.getElementById("view-projects").style.display !== "none";
    const vPlots = document.getElementById("view-plots").style.display !== "none";
    const vWorksheets = document.getElementById("view-worksheets").style.display !== "none";
    const vDetail = document.getElementById("view-worksheet-detail").style.display !== "none";

    if (vPlots) {
        switchView("view-projects");
    } else if (vWorksheets) {
        switchView("view-plots");
    } else if (vDetail) {
        switchView("view-worksheets");
    }
}

// Modal Helpers
function openModal(id) { document.getElementById(id).style.display = "flex"; }
function closeModal(id) { document.getElementById(id).style.display = "none"; }

// --- PROJECT ACTIONS ---
function createProject() {
    const nameInput = document.getElementById("newProjectName");
    if (!nameInput.value.trim()) return;
    
    const newProj = {
        id: "proj_" + Date.now(),
        name: nameInput.value.trim(),
        plots: []
    };
    
    appData.projects.push(newProj);
    saveToStorage();
    renderProjects();
    nameInput.value = "";
    closeModal("projectModal");
}

function renderProjects() {
    const list = document.getElementById("project-list");
    list.innerHTML = "";
    if (appData.projects.length === 0) {
        list.innerHTML = "<p style='text-align:center; padding:20px; color:#999;'>ยังไม่มีโครงการ กรุณาเพิ่มโครงการใหม่</p>";
        return;
    }
    appData.projects.forEach(p => {
        const card = document.createElement("div");
        card.className = "item-card";
        card.onclick = () => selectProject(p.id);
        card.innerHTML = `
            <div>
                <div class="item-title">${p.name}</div>
                <div class="item-meta">จำนวนแปลง: ${p.plots.length} แปลง</div>
            </div>
            <div class="chevron">&rsaquo;</div>
        `;
        list.appendChild(card);
    });
}

function selectProject(id) {
    currentProjectId = id;
    const proj = appData.projects.find(p => p.id === id);
    document.getElementById("current-project-title").innerText = proj.name;
    renderPlots();
    switchView("view-plots");
}

// --- PLOT ACTIONS ---
function createPlot() {
    const plotInput = document.getElementById("newPlotNumber");
    if (!plotInput.value.trim()) return;
    
    const proj = appData.projects.find(p => p.id === currentProjectId);
    const newPlot = {
        id: "plot_" + Date.now(),
        number: plotInput.value.trim(),
        worksheets: []
    };
    
    proj.plots.push(newPlot);
    saveToStorage();
    renderPlots();
    plotInput.value = "";
    closeModal("plotModal");
}

function renderPlots() {
    const list = document.getElementById("plot-list");
    list.innerHTML = "";
    const proj = appData.projects.find(p => p.id === currentProjectId);
    if (!proj || proj.plots.length === 0) {
        list.innerHTML = "<p style='text-align:center; padding:20px; color:#999;'>ยังไม่มีแปลงในโครงการนี้</p>";
        return;
    }
    proj.plots.forEach(pl => {
        const card = document.createElement("div");
        card.className = "item-card";
        card.onclick = () => selectPlot(pl.id);
        card.innerHTML = `
            <div>
                <div class="item-title">แปลงเลขที่: ${pl.number}</div>
                <div class="item-meta">ใบงานตรวจ: ${pl.worksheets.length} รายการ</div>
            </div>
            <div class="chevron">&rsaquo;</div>
        `;
        list.appendChild(card);
    });
}

function selectPlot(id) {
    currentPlotId = id;
    const proj = appData.projects.find(p => p.id === currentProjectId);
    const plot = proj.plots.find(pl => pl.id === id);
    document.getElementById("current-plot-title").innerText = `แปลง ${plot.number} - ใบงาน`;
    renderWorksheets();
    switchView("view-worksheets");
}

// --- WORKSHEET ACTIONS ---
function createWorksheet() {
    const typeSelect = document.getElementById("newWorksheetType");
    const proj = appData.projects.find(p => p.id === currentProjectId);
    const plot = proj.plots.find(pl => pl.id === currentPlotId);
    
    const newSheet = {
        id: "sheet_" + Date.now(),
        type: typeSelect.value,
        date: new Date().toLocaleDateString('th-TH'),
        defects: [],
        signatureSE: "",
        signatureCustomer: ""
    };
    
    plot.worksheets.push(newSheet);
    saveToStorage();
    renderWorksheets();
    closeModal("worksheetModal");
    selectWorksheet(newSheet.id);
}

function renderWorksheets() {
    const list = document.getElementById("worksheet-list");
    list.innerHTML = "";
    const proj = appData.projects.find(p => p.id === currentProjectId);
    const plot = proj.plots.find(pl => pl.id === currentPlotId);
    
    if (!plot || plot.worksheets.length === 0) {
        list.innerHTML = "<p style='text-align:center; padding:20px; color:#999;'>ยังไม่มีใบงานตรวจสำหรับแปลงนี้</p>";
        return;
    }
    
    plot.worksheets.forEach(sh => {
        const card = document.createElement("div");
        card.className = "item-card";
        card.onclick = () => selectWorksheet(sh.id);
        const typeText = sh.type === 'Stock' ? 'บ้าน Stock (ภายใน)' : 'ก่อนโอนกับลูกค้า';
        card.innerHTML = `
            <div>
                <div class="item-title">${typeText}</div>
                <div class="item-meta">วันที่สร้าง: ${sh.date} | จุดบกพร่อง: ${sh.defects.length} จุด</div>
            </div>
            <div class="chevron">&rsaquo;</div>
        `;
        list.appendChild(card);
    });
}

function selectWorksheet(id) {
    currentWorksheetId = id;
    const proj = appData.projects.find(p => p.id === currentProjectId);
    const plot = proj.plots.find(pl => pl.id === currentPlotId);
    const sheet = plot.worksheets.find(sh => sh.id === id);
    
    // Set text values
    document.getElementById("rep-project").innerText = proj.name;
    document.getElementById("rep-plot").innerText = plot.number;
    document.getElementById("rep-type").innerText = sheet.type === 'Stock' ? 'ตรวจบ้าน Stock (ภายใน)' : 'ตรวจรับบ้านก่อนโอนพร้อมลูกค้า';
    document.getElementById("rep-date").innerText = sheet.date;
    
    // Toggle customer signature area if Stock
    const custWrapper = document.getElementById("customer-sig-wrapper");
    if (sheet.type === 'Stock') {
        custWrapper.style.display = "none";
    } else {
        custWrapper.style.display = "block";
    }
    
    renderDefectItems(sheet.defects);
    
    // Load signatures if present
    clearSignature('se');
    clearSignature('customer');
    
    const imgSePlace = document.getElementById("img-se-placeholder");
    const imgCustPlace = document.getElementById("img-customer-placeholder");
    imgSePlace.innerHTML = "";
    imgCustPlace.innerHTML = "";
    
    if (sheet.signatureSE) {
        imgSePlace.innerHTML = `<img src="${sheet.signatureSE}" alt="SE Sig">`;
    }
    if (sheet.signatureCustomer && sheet.type !== 'Stock') {
        imgCustPlace.innerHTML = `<img src="${sheet.signatureCustomer}" alt="Customer Sig">`;
    }

    switchView("view-worksheet-detail");
    
    // Resize canvases when visible
    setTimeout(() => {
        resizeCanvas(document.getElementById("canvas-se"));
        resizeCanvas(document.getElementById("canvas-customer"));
    }, 200);
}

// --- DEFECT WORKFLOW ---
function setupImageUpload() {
    const fileInput = document.getElementById("defectPhoto");
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            currentDefectPhotoBase64 = event.target.result;
            const previewBox = document.getElementById("photo-preview-box");
            previewBox.style.display = "block";
            previewBox.innerHTML = `<img src="${currentDefectPhotoBase64}" />`;
        };
        reader.readAsDataURL(file);
    });
}

function addDefectItem() {
    const descInput = document.getElementById("defectDesc");
    if (!descInput.value.trim() && !currentDefectPhotoBase64) {
        alert("กรุณาใส่รายละเอียดจุดบกพร่องหรือถ่ายภาพประกอบ");
        return;
    }
    
    const proj = appData.projects.find(p => p.id === currentProjectId);
    const plot = proj.plots.find(pl => pl.id === currentPlotId);
    const sheet = plot.worksheets.find(sh => sh.id === currentWorksheetId);
    
    const item = {
        id: "def_" + Date.now(),
        photo: currentDefectPhotoBase64 || "https://via.placeholder.com/150?text=No+Photo",
        note: descInput.value.trim() || "ไม่ได้ระบุคำอธิบาย"
    };
    
    sheet.defects.push(item);
    saveToStorage();
    renderDefectItems(sheet.defects);
    
    // Reset form
    descInput.value = "";
    currentDefectPhotoBase64 = "";
    document.getElementById("photo-preview-box").style.display = "none";
    document.getElementById("defectPhoto").value = "";
}

function renderDefectItems(defects) {
    const container = document.getElementById("defect-items-container");
    container.innerHTML = "";
    if (defects.length === 0) {
        container.innerHTML = "<p class='no-print' style='color:#888; padding:10px 0;'>ยังไม่มีบันทึกจุดบกพร่อง</p>";
        return;
    }
    defects.forEach((df, index) => {
        const row = document.createElement("div");
        row.className = "defect-row";
        row.innerHTML = `
            <div class="defect-img-col">
                <img src="${df.photo}" alt="Defect Photo">
            </div>
            <div class="defect-text-col">
                <div class="defect-num">จุดบกพร่องที่ ${index + 1}</div>
                <p class="defect-desc-text">${df.note}</p>
                <button class="btn-clear no-print" style="color:var(--primary);" onclick="deleteDefectItem('${df.id}')">ลบรายการนี้</button>
            </div>
        `;
        container.appendChild(row);
    });
}

function deleteDefectItem(id) {
    const proj = appData.projects.find(p => p.id === currentProjectId);
    const plot = proj.plots.find(pl => pl.id === currentPlotId);
    const sheet = plot.worksheets.find(sh => sh.id === currentWorksheetId);
    sheet.defects = sheet.defects.filter(df => df.id !== id);
    saveToStorage();
    renderDefectItems(sheet.defects);
}

// --- SIGNATURE WORKFLOW ---
function setupSignaturePads() {
    const canvasSE = document.getElementById("canvas-se");
    const canvasCustomer = document.getElementById("canvas-customer");
    
    sigPadSE = new SignaturePad(canvasSE, { penColor: "rgb(0, 0, 128)" });
    sigPadCustomer = new SignaturePad(canvasCustomer, { penColor: "rgb(0, 0, 128)" });
}

function resizeCanvas(canvas) {
    const ratio =  Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext("2d").scale(ratio, ratio);
}

function clearSignature(type) {
    if (type === 'se') {
        sigPadSE.clear();
        document.getElementById("img-se-placeholder").innerHTML = "";
    } else {
        sigPadCustomer.clear();
        document.getElementById("img-customer-placeholder").innerHTML = "";
    }
}

function saveWorksheetData() {
    const proj = appData.projects.find(p => p.id === currentProjectId);
    const plot = proj.plots.find(pl => pl.id === currentPlotId);
    const sheet = plot.worksheets.find(sh => sh.id === currentWorksheetId);
    
    // Save signature images if drawn
    if (!sigPadSE.isEmpty()) {
        sheet.signatureSE = sigPadSE.toDataURL();
    }
    if (!sigPadCustomer.isEmpty() && sheet.type !== 'Stock') {
        sheet.signatureCustomer = sigPadCustomer.toDataURL();
    }
    
    saveToStorage();
    alert("บันทึกข้อมูลใบงานสำเร็จเรียบร้อย!");
    selectWorksheet(sheet.id); // Reload view state
}

// --- PDF GENERATION ---
function generatePDF() {
    const element = document.getElementById("pdf-export-area");
    const projName = document.getElementById("rep-project").innerText;
    const plotNum = document.getElementById("rep-plot").innerText;
    
    // Prepare pure view configuration for html2pdf
    const opt = {
        margin:       [12, 12, 12, 12],
        filename:     `รายงานตรวจบ้าน_${projName}_แปลง_${plotNum}.pdf`,
        image:        { type: 'jpeg', quality: 0.95 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Prompt save warning if signatures are unsaved
    if (!sigPadSE.isEmpty() || !sigPadCustomer.isEmpty()) {
        if(confirm("ตรวจพบรอยเซ็นที่ยังไม่ได้กด 'บันทึกข้อมูลใบงาน' ต้องการให้ระบบทำการเซฟก่อนแปลงไฟล์หรือไม่?")) {
            saveWorksheetData();
        }
    }

    html2pdf().set(opt).from(element).save();
}

// Register Progressive Web App Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker successfully operational', reg.scope))
            .catch(err => console.log('Service Worker operation failed: ', err));
    });
}
