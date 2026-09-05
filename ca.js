const canvas = document.getElementById("graph");
const ctx = canvas ? canvas.getContext("2d") : null;

let project = null;

let selectedNode = null;
let hoveredNode = null;

let currentTool = "select";
let edgeStart = null;

let viewX = 0;
let viewY = 0;
let viewZoom = 1;

let is3D = false;

let rotationX = -0.25;
let rotationY = 0.35;

let pointerDown = false;
let draggingNode = false;
let panning = false;
let rotating = false;

let activeNode = null;

let lastPointerX = 0;
let lastPointerY = 0;

let dragOffsetX = 0;
let dragOffsetY = 0;

let spacePressed = false;

const TYPES = {
    person: {
        label: "PERSON",
        icon: "●",
        color: "#7c5cff"
    },

    company: {
        label: "COMPANY",
        icon: "■",
        color: "#00d4ff"
    },

    organization: {
        label: "ORGANIZATION",
        icon: "◇",
        color: "#00e6a0"
    },

    tiktok: {
        label: "TIKTOK",
        icon: "♪",
        color: "#ffffff"
    },

    telegram: {
        label: "TELEGRAM",
        icon: "➤",
        color: "#2AABEE"
    },

    discord: {
        label: "DISCORD",
        icon: "◌",
        color: "#5865F2"
    },

    email: {
        label: "EMAIL",
        icon: "@",
        color: "#e8ff3d"
    },

    phone: {
        label: "PHONE",
        icon: "☎",
        color: "#43e6a0"
    },

    location: {
        label: "LOCATION",
        icon: "⌖",
        color: "#ff8a3d"
    },

    date: {
        label: "DATE",
        icon: "◷",
        color: "#ff9f43"
    },

    domain: {
        label: "DOMAIN",
        icon: "⌁",
        color: "#ff4fd8"
    },

    social: {
        label: "SOCIAL",
        icon: "◎",
        color: "#5b8cff"
    },

    document: {
        label: "DOCUMENT",
        icon: "▤",
        color: "#b47cff"
    },

    unknown: {
        label: "UNKNOWN",
        icon: "?",
        color: "#858b9b"
    }
};


/* =========================================================
   BASIC HELPERS
========================================================= */

function uid() {
    return (
        Date.now().toString(36) +
        Math.random().toString(36).slice(2)
    );
}

function getType(type) {
    return TYPES[type] || TYPES.unknown;
}

function escapeHTML(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function hexToRGBA(hex, alpha) {
    let value = String(hex || "#7c5cff")
        .replace("#", "");

    if (value.length === 3) {
        value =
            value[0] + value[0] +
            value[1] + value[1] +
            value[2] + value[2];
    }

    const n = parseInt(value, 16);

    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function safeFilename(name) {
    return String(name || "claide_project")
        .replace(/[^a-zA-Zа-яА-Я0-9_-]/g, "_")
        .slice(0, 60);
}


/* =========================================================
   PROJECTS
========================================================= */

function createProject(name) {
    return {
        id: uid(),
        name: name || "Untitled Investigation",
        createdAt: Date.now(),
        updatedAt: Date.now(),

        theme: "#7c5cff",

        nodes: [],
        edges: [],
        timeline: []
    };
}

function getProjects() {
    try {
        return JSON.parse(
            localStorage.getItem("orbit_projects") || "[]"
        );
    } catch (error) {
        return [];
    }
}

function newProject() {
    project = createProject("Untitled Investigation");

    const center = addNode(
        "Target",
        "person",
        0,
        0,
        0
    );

    const telegram = addNode(
        "Telegram",
        "telegram",
        250,
        -100,
        50
    );

    const email = addNode(
        "Email",
        "email",
        250,
        110,
        -50
    );

    const phone = addNode(
        "Phone",
        "phone",
        -250,
        -100,
        -70
    );

    const location = addNode(
        "Location",
        "location",
        -250,
        110,
        70
    );

    project.edges.push({
        id: uid(),
        source: center.id,
        target: telegram.id,
        label: "linked"
    });

    project.edges.push({
        id: uid(),
        source: center.id,
        target: email.id,
        label: "associated"
    });

    project.edges.push({
        id: uid(),
        source: center.id,
        target: phone.id,
        label: "associated"
    });

    project.edges.push({
        id: uid(),
        source: center.id,
        target: location.id,
        label: "located"
    });

    selectedNode = center;

    saveProject(false);

    openApp();

    centerGraph();
}

function addNode(name, type, x, y, z) {
    const node = {
        id: uid(),

        name: name || "New Entity",

        type: type || "unknown",

        value: "",
        source: "",
        note: "",

        x: Number(x) || 0,
        y: Number(y) || 0,
        z: Number(z) || 0,

        searchMatch: true
    };

    if (!project.nodes) {
        project.nodes = [];
    }

    project.nodes.push(node);

    addTimelineEvent(
        "Entity added",
        `${node.name || "Entity"} · ${String(node.type || "unknown").toUpperCase()}`
    );

    return node;
}


/* =========================================================
   SAVE
========================================================= */

function saveProject(showStatus) {
    if (!project) {
        return;
    }

    project.updatedAt = Date.now();

    const projects = getProjects();

    const index = projects.findIndex(function(item) {
        return item.id === project.id;
    });

    if (index === -1) {
        projects.unshift(project);
    } else {
        projects[index] = project;
    }

    localStorage.setItem(
        "orbit_projects",
        JSON.stringify(projects)
    );

    if (showStatus !== false) {
        showSavedStatus();
    }
}

function loadProject(id) {
    const projects = getProjects();

    const found = projects.find(function(item) {
        return item.id === id;
    });

    if (!found) {
        return;
    }

    project = found;

    if (!project.nodes) {
        project.nodes = [];
    }

    if (!project.edges) {
        project.edges = [];
    }

    project.nodes.forEach(function(node) {
        if (typeof node.z !== "number") {
            node.z = 0;
        }

        if (typeof node.searchMatch === "undefined") {
            node.searchMatch = true;
        }
    });

    setTheme(
        project.theme || "#7c5cff",
        false
    );

    openApp();

    centerGraph();
}

function deleteProject(id) {
    const projects = getProjects().filter(function(item) {
        return item.id !== id;
    });

    localStorage.setItem(
        "orbit_projects",
        JSON.stringify(projects)
    );

    renderSaves();
}

function renderSaves() {
    const grid = document.getElementById("saveGrid");
    const count = document.getElementById("saveCount");

    if (!grid || !count) {
        return;
    }

    const projects = getProjects().sort(function(a, b) {
        return (
            (b.updatedAt || 0) -
            (a.updatedAt || 0)
        );
    });

    count.textContent =
        projects.length === 1
            ? "1 проект"
            : `${projects.length} проектов`;

    if (projects.length === 0) {
        grid.innerHTML =
            '<div class="empty-saves">' +
            "Сохранений пока нет.<br>" +
            "Создайте первое исследование." +
            "</div>";

        return;
    }

    grid.innerHTML = projects.map(function(item) {
        const date = new Date(
            item.updatedAt || Date.now()
        ).toLocaleString("ru-RU", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });

        return `
            <div class="save-card">

                <h3>
                    ${escapeHTML(item.name)}
                </h3>

                <p>
                    ${(item.nodes || []).length}
                    entities ·
                    ${(item.edges || []).length}
                    links
                </p>

                <button
                    class="save-delete"
                    onclick="deleteProject('${item.id}')">
                    удалить
                </button>

                <button
                    class="save-open"
                    onclick="loadProject('${item.id}')">
                    Открыть
                </button>

                <div class="save-meta">
                    <span>${date}</span>
                    <span
                        style="color:${item.theme || "#7c5cff"}">
                        ●
                    </span>
                </div>

            </div>
        `;
    }).join("");
}


/* =========================================================
   APP
========================================================= */

function openApp() {
    const start = document.getElementById("startScreen");
    const app = document.getElementById("app");

    if (start) {
        start.style.display = "none";
    }

    if (app) {
        app.style.display = "block";
    }

    updateUI();

    resizeCanvas();

    updateInspector();

    draw();
}

function backHome() {
    saveProject(false);

    const start = document.getElementById("startScreen");
    const app = document.getElementById("app");

    if (app) {
        app.style.display = "none";
    }

    if (start) {
        start.style.display = "block";
    }

    renderSaves();
}


/* =========================================================
   INSPECTOR
========================================================= */

function updateInspector() {
    const empty =
        document.getElementById("emptyInspector");

    const inspector =
        document.getElementById("entityInspector");

    if (!empty || !inspector) {
        return;
    }

    if (!selectedNode) {
        empty.style.display = "block";
        inspector.style.display = "none";
        updateAnalysis();
        return;
    }

    empty.style.display = "none";
    inspector.style.display = "block";

    const name =
        document.getElementById("entityName");

    const type =
        document.getElementById("entityType");

    const source =
        document.getElementById("entitySource");

    const value =
        document.getElementById("entityValue");

    const note =
        document.getElementById("entityNote");

    if (name) {
        name.value = selectedNode.name || "";
    }

    if (type) {
        type.value = selectedNode.type || "unknown";
    }

    if (source) {
        source.value = selectedNode.source || "";
    }

    if (value) {
        value.value = selectedNode.value || "";
    }

    if (note) {
        note.value = selectedNode.note || "";
    }

    updateEntityPreview();
    updateAnalysis();
}

function updateEntityPreview() {
    if (!selectedNode) {
        return;
    }

    const info =
        getType(selectedNode.type);

    const icon =
        document.getElementById(
            "entityPreviewIcon"
        );

    const name =
        document.getElementById(
            "previewName"
        );

    const type =
        document.getElementById(
            "previewType"
        );

    if (icon) {
        icon.textContent = info.icon;
        icon.style.color = info.color;
    }

    if (name) {
        name.textContent =
            selectedNode.name || "Entity";
    }

    if (type) {
        type.textContent = info.label;
    }
}

function updateSelected(key, value) {
    if (!selectedNode) {
        return;
    }

    selectedNode[key] = value;

    updateEntityPreview();

    updateUI();

    draw();

    clearTimeout(
        window.claideSaveTimer
    );

    window.claideSaveTimer =
        setTimeout(function() {
            saveProject(false);
        }, 300);
}

function clearSelection() {
    selectedNode = null;
    edgeStart = null;

    updateInspector();

    draw();
}

function deleteSelected() {
    if (!selectedNode || !project) {
        return;
    }

    const id = selectedNode.id;

    project.nodes =
        project.nodes.filter(function(node) {
            return node.id !== id;
        });

    project.edges =
        project.edges.filter(function(edge) {
            return (
                edge.source !== id &&
                edge.target !== id
            );
        });

    selectedNode = null;
    edgeStart = null;

    updateInspector();

    updateUI();

    saveProject(false);

    draw();
}


/* =========================================================
   MODAL
========================================================= */

function openAddModal() {
    const modal =
        document.getElementById("addModal");

    if (!modal) {
        return;
    }

    modal.classList.add("open");

    const input =
        document.getElementById("newName");

    if (input) {
        setTimeout(function() {
            input.focus();
        }, 50);
    }
}

function closeAddModal() {
    const modal =
        document.getElementById("addModal");

    if (modal) {
        modal.classList.remove("open");
    }
}

function createEntityFromModal() {
    const nameInput =
        document.getElementById("newName");

    const typeInput =
        document.getElementById("newType");

    if (!nameInput || !typeInput) {
        return;
    }

    const name =
        nameInput.value.trim();

    const type =
        typeInput.value;

    if (!name) {
        nameInput.focus();
        return;
    }

    const position =
        screenToWorld(
            canvas.clientWidth / 2,
            canvas.clientHeight / 2
        );

    const node =
        addNode(
            name,
            type,
            position.x,
            position.y,
            0
        );

    selectedNode = node;

    nameInput.value = "";

    closeAddModal();

    updateInspector();

    updateUI();

    saveProject(false);

    draw();
}


/* =========================================================
   UI
========================================================= */

function updateUI() {
    if (!project) {
        return;
    }

    const title =
        document.getElementById("projectTitle");

    const meta =
        document.getElementById("projectMeta");

    const nodes =
        document.getElementById("statNodes");

    const edges =
        document.getElementById("statEdges");

    if (title) {
        title.textContent = project.name;
    }

    if (meta) {
        meta.textContent =
            `${project.nodes.length} entities · ` +
            `${project.edges.length} connections`;
    }

    if (nodes) {
        nodes.textContent =
            project.nodes.length;
    }

    if (edges) {
        edges.textContent =
            project.edges.length;
    }

    updateAnalysis();
    updateTimeline();
}

function showSavedStatus() {
    const status =
        document.querySelector(".save-status");

    if (!status) {
        return;
    }

    status.innerHTML =
        "<i></i><span>Saved</span>";

    clearTimeout(
        window.claideSavedTimer
    );

    window.claideSavedTimer =
        setTimeout(function() {
            status.innerHTML =
                "<i></i><span>Auto-saved</span>";
        }, 1200);
}


/* =========================================================
   TOOLS
========================================================= */

function setTool(tool, element) {
    currentTool = tool;

    edgeStart = null;

    const buttons =
        document.querySelectorAll(".tool");

    buttons.forEach(function(button) {
        button.classList.remove("active");
    });

    if (element) {
        element.classList.add("active");
    }
}


/* =========================================================
   SEARCH
========================================================= */

function searchGraph(query) {
    if (!project) {
        return;
    }

    const text =
        String(query || "")
            .toLowerCase()
            .trim();

    project.nodes.forEach(function(node) {
        if (!text) {
            node.searchMatch = true;
            return;
        }

        const data =
            `${node.name || ""} ` +
            `${node.type || ""} ` +
            `${node.value || ""} ` +
            `${node.source || ""} ` +
            `${node.note || ""}`;

        node.searchMatch =
            data.toLowerCase().includes(text);
    });

    draw();
}


/* =========================================================
   CANVAS RESIZE
========================================================= */

function resizeCanvas() {
    if (!canvas || !ctx) {
        return;
    }

    const rect =
        canvas.getBoundingClientRect();

    const dpr =
        window.devicePixelRatio || 1;

    canvas.width =
        rect.width * dpr;

    canvas.height =
        rect.height * dpr;

    ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
    );

    draw();
}


/* =========================================================
   COORDINATES
========================================================= */

function screenToWorld(screenX, screenY) {
    if (!canvas) {
        return {
            x: 0,
            y: 0
        };
    }

    const width =
        canvas.clientWidth;

    const height =
        canvas.clientHeight;

    return {
        x:
            (
                screenX -
                width / 2 -
                viewX
            ) / viewZoom,

        y:
            (
                screenY -
                height / 2 -
                viewY
            ) / viewZoom
    };
}

function worldToScreen(x, y) {
    if (!canvas) {
        return {
            x: 0,
            y: 0
        };
    }

    const width =
        canvas.clientWidth;

    const height =
        canvas.clientHeight;

    return {
        x:
            width / 2 +
            viewX +
            x * viewZoom,

        y:
            height / 2 +
            viewY +
            y * viewZoom
    };
}


/* =========================================================
   3D PROJECTION
========================================================= */

function project3D(x, y, z) {
    const cosY = Math.cos(rotationY);
    const sinY = Math.sin(rotationY);

    const cosX = Math.cos(rotationX);
    const sinX = Math.sin(rotationX);

    const x1 =
        x * cosY -
        z * sinY;

    const z1 =
        x * sinY +
        z * cosY;

    const y1 =
        y * cosX -
        z1 * sinX;

    const z2 =
        y * sinX +
        z1 * cosX;

    const perspective =
        700;

    const scale =
        perspective /
        (perspective + z2);

    const width =
        canvas.clientWidth;

    const height =
        canvas.clientHeight;

    return {
        x:
            width / 2 +
            viewX +
            x1 * viewZoom * scale,

        y:
            height / 2 +
            viewY +
            y1 * viewZoom * scale,

        scale: scale,

        depth: z2
    };
}

function getNodeScreenPosition(node) {
    if (is3D) {
        return project3D(
            node.x,
            node.y,
            node.z || 0
        );
    }

    return worldToScreen(
        node.x,
        node.y
    );
}


/* =========================================================
   DRAW
========================================================= */

function draw() {
    if (!canvas || !ctx || !project) {
        return;
    }

    const width =
        canvas.clientWidth;

    const height =
        canvas.clientHeight;

    ctx.clearRect(
        0,
        0,
        width,
        height
    );

    drawBackground();

    if (is3D) {
        draw3DGrid();
    } else {
        draw2DGrid();
    }

    drawEdges();

    drawNodes();
}

function drawBackground() {
    const width =
        canvas.clientWidth;

    const height =
        canvas.clientHeight;

    const gradient =
        ctx.createRadialGradient(
            width / 2,
            height / 2,
            0,
            width / 2,
            height / 2,
            Math.max(width, height)
        );

    gradient.addColorStop(
        0,
        "rgba(124,92,255,0.035)"
    );

    gradient.addColorStop(
        1,
        "rgba(0,0,0,0)"
    );

    ctx.fillStyle = gradient;

    ctx.fillRect(
        0,
        0,
        width,
        height
    );
}

function draw2DGrid() {
    const width =
        canvas.clientWidth;

    const height =
        canvas.clientHeight;

    const grid =
        50 * viewZoom;

    if (grid < 10) {
        return;
    }

    const startX =
        (
            width / 2 +
            viewX
        ) % grid;

    const startY =
        (
            height / 2 +
            viewY
        ) % grid;

    ctx.beginPath();

    ctx.strokeStyle =
        "rgba(255,255,255,0.025)";

    ctx.lineWidth = 1;

    for (
        let x = startX;
        x < width;
        x += grid
    ) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }

    for (
        let y = startY;
        y < height;
        y += grid
    ) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }

    ctx.stroke();
}


/* =========================================================
   3D GRID
========================================================= */

function draw3DGrid() {
    const size = 700;
    const step = 100;

    const points = [];

    for (
        let x = -size;
        x <= size;
        x += step
    ) {
        points.push({
            a: project3D(x, -size, 300),
            b: project3D(x, size, 300)
        });
    }

    for (
        let y = -size;
        y <= size;
        y += step
    ) {
        points.push({
            a: project3D(-size, y, 300),
            b: project3D(size, y, 300)
        });
    }

    ctx.beginPath();

    ctx.strokeStyle =
        "rgba(124,92,255,0.08)";

    ctx.lineWidth = 1;

    points.forEach(function(line) {
        ctx.moveTo(
            line.a.x,
            line.a.y
        );

        ctx.lineTo(
            line.b.x,
            line.b.y
        );
    });

    ctx.stroke();
}


/* =========================================================
   EDGES
========================================================= */

function drawEdges() {
    if (!project || !project.edges) {
        return;
    }

    project.edges.forEach(function(edge) {
        const source =
            project.nodes.find(function(node) {
                return node.id === edge.source;
            });

        const target =
            project.nodes.find(function(node) {
                return node.id === edge.target;
            });

        if (!source || !target) {
            return;
        }

        const a =
            getNodeScreenPosition(source);

        const b =
            getNodeScreenPosition(target);

        const connected =
            selectedNode &&
            (
                selectedNode.id === source.id ||
                selectedNode.id === target.id
            );

        const accent =
            getComputedStyle(
                document.documentElement
            )
                .getPropertyValue("--accent")
                .trim() ||
            "#7c5cff";

        const depth =
            is3D
                ? Math.max(
                    0.25,
                    Math.min(
                        1,
                        (
                            a.scale +
                            b.scale
                        ) / 2
                    )
                )
                : 1;

        ctx.beginPath();

        ctx.moveTo(
            a.x,
            a.y
        );

        ctx.lineTo(
            b.x,
            b.y
        );

        ctx.strokeStyle =
            connected
                ? accent
                : `rgba(255,255,255,${0.12 * depth})`;

        ctx.lineWidth =
            connected ? 2 : 1;

        ctx.stroke();

        drawArrow(
            a.x,
            a.y,
            b.x,
            b.y,
            connected
                ? accent
                : "#555b69"
        );

        if (edge.label) {
            const x =
                (a.x + b.x) / 2;

            const y =
                (a.y + b.y) / 2;

            ctx.font =
                "9px Inter, Arial, sans-serif";

            ctx.textAlign = "center";

            ctx.fillStyle =
                "#666d7b";

            ctx.fillText(
                edge.label,
                x,
                y - 8
            );
        }
    });
}

function drawArrow(
    x1,
    y1,
    x2,
    y2,
    color
) {
    const angle =
        Math.atan2(
            y2 - y1,
            x2 - x1
        );

    const size = 7;

    ctx.beginPath();

    ctx.moveTo(
        x2,
        y2
    );

    ctx.lineTo(
        x2 -
            size *
            Math.cos(
                angle - 0.45
            ),

        y2 -
            size *
            Math.sin(
                angle - 0.45
            )
    );

    ctx.lineTo(
        x2 -
            size *
            Math.cos(
                angle + 0.45
            ),

        y2 -
            size *
            Math.sin(
                angle + 0.45
            )
    );

    ctx.closePath();

    ctx.fillStyle = color;

    ctx.fill();
}


/* =========================================================
   NODES
========================================================= */

function drawNodes() {
    if (!project) {
        return;
    }

    let nodes =
        project.nodes.slice();

    if (is3D) {
        nodes.sort(function(a, b) {
            const pa =
                project3D(
                    a.x,
                    a.y,
                    a.z || 0
                );

            const pb =
                project3D(
                    b.x,
                    b.y,
                    b.z || 0
                );

            return pb.depth - pa.depth;
        });
    }

    nodes.forEach(function(node) {
        const point =
            getNodeScreenPosition(node);

        const info =
            getType(node.type);

        const depthScale =
            is3D
                ? Math.max(
                    0.45,
                    Math.min(
                        1.35,
                        point.scale
                    )
                )
                : 1;

        const radius =
            (
                node === selectedNode
                    ? 25
                    : 21
            ) * depthScale;

        const faded =
            node.searchMatch === false;

        ctx.globalAlpha =
            faded ? 0.12 : 1;

        if (
            node === selectedNode ||
            node === hoveredNode
        ) {
            ctx.beginPath();

            ctx.arc(
                point.x,
                point.y,
                radius + 9 * depthScale,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                hexToRGBA(
                    info.color,
                    0.12
                );

            ctx.fill();
        }

        ctx.beginPath();

        ctx.arc(
            point.x,
            point.y,
            radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "#151821";

        ctx.fill();

        ctx.strokeStyle =
            info.color;

        ctx.lineWidth =
            node === selectedNode
                ? 3
                : 1.5;

        ctx.stroke();

        ctx.font =
            `bold ${14 * depthScale}px Arial`;

        ctx.textAlign =
            "center";

        ctx.textBaseline =
            "middle";

        ctx.fillStyle =
            info.color;

        ctx.fillText(
            info.icon,
            point.x,
            point.y
        );

        ctx.font =
            `${Math.max(
                8,
                11 * depthScale
            )}px Arial`;

        ctx.textBaseline =
            "alphabetic";

        ctx.fillStyle =
            "#eef1f7";

        ctx.fillText(
            node.name || "Entity",
            point.x,
            point.y +
                radius +
                16 * depthScale
        );

        ctx.font =
            `${Math.max(
                7,
                8 * depthScale
            )}px Arial`;

        ctx.fillStyle =
            "#686f7e";

        ctx.fillText(
            info.label,
            point.x,
            point.y +
                radius +
                29 * depthScale
        );

        ctx.globalAlpha = 1;
    });
}


/* =========================================================
   FIND NODE
========================================================= */

function findNodeAt(
    screenX,
    screenY
) {
    if (!project) {
        return null;
    }

    let closest = null;

    let closestDistance =
        Infinity;

    project.nodes.forEach(function(node) {
        const point =
            getNodeScreenPosition(node);

        const distance =
            Math.hypot(
                screenX - point.x,
                screenY - point.y
            );

        const radius =
            (
                is3D
                    ? 30 * point.scale
                    : 30
            );

        if (
            distance < radius &&
            distance < closestDistance
        ) {
            closest = node;
            closestDistance = distance;
        }
    });

    return closest;
}


/* =========================================================
   MOUSE POSITION
========================================================= */

function getCanvasPosition(event) {
    const rect =
        canvas.getBoundingClientRect();

    return {
        x:
            event.clientX -
            rect.left,

        y:
            event.clientY -
            rect.top
    };
}


/* =========================================================
   POINTER DOWN
========================================================= */

canvas.addEventListener(
    "pointerdown",
    function(event) {
        if (!project) {
            return;
        }

        const pos =
            getCanvasPosition(event);

        const node =
            findNodeAt(
                pos.x,
                pos.y
            );

        pointerDown = true;

        lastPointerX =
            pos.x;

        lastPointerY =
            pos.y;

        canvas.setPointerCapture(
            event.pointerId
        );

        /*
         * MIDDLE MOUSE
         * Всегда двигает карту.
         */

        if (event.button === 1) {
            panning = true;

            canvas.style.cursor =
                "grabbing";

            return;
        }

        /*
         * RIGHT MOUSE
         * В 3D вращает пространство.
         */

        if (
            event.button === 2 &&
            is3D
        ) {
            rotating = true;

            canvas.style.cursor =
                "grabbing";

            return;
        }

        /*
         * SPACE + ЛКМ
         * Двигает карту.
         */

        if (
            event.button === 0 &&
            spacePressed
        ) {
            panning = true;

            canvas.style.cursor =
                "grabbing";

            return;
        }

        /*
         * NODE TOOL
         */

        if (
            currentTool === "node" &&
            event.button === 0
        ) {
            const world =
                screenToWorld(
                    pos.x,
                    pos.y
                );

            const newNode =
                addNode(
                    "New Entity",
                    "unknown",
                    world.x,
                    world.y,
                    0
                );

            selectedNode =
                newNode;

            updateInspector();

            updateUI();

            saveProject(false);

            draw();

            return;
        }

        /*
         * EDGE TOOL
         */

        if (
            currentTool === "edge" &&
            event.button === 0
        ) {
            if (!node) {
                return;
            }

            if (!edgeStart) {
                edgeStart = node;

                selectedNode =
                    node;

                draw();

                return;
            }

            if (
                edgeStart.id !==
                node.id
            ) {
                project.edges.push({
                    id: uid(),

                    source:
                        edgeStart.id,

                    target:
                        node.id,

                    label: "linked"
                });

                saveProject(false);

                updateUI();
            }

            edgeStart = null;

            draw();

            return;
        }

        /*
         * SELECT TOOL
         */

        if (
            event.button === 0 &&
            node
        ) {
            selectedNode =
                node;

            activeNode =
                node;

            draggingNode = true;

            const world =
                screenToWorld(
                    pos.x,
                    pos.y
                );

            dragOffsetX =
                node.x -
                world.x;

            dragOffsetY =
                node.y -
                world.y;

            updateInspector();

            draw();

            return;
        }

        /*
         * ПУСТОЕ МЕСТО
         *
         * ЛКМ = ДВИГАЕМ ВСЮ КАРТУ
         */

        if (
            event.button === 0
        ) {
            panning = true;

            canvas.style.cursor =
                "grabbing";
        }
    }
);


/* =========================================================
   POINTER MOVE
========================================================= */

canvas.addEventListener(
    "pointermove",
    function(event) {
        if (!project) {
            return;
        }

        const pos =
            getCanvasPosition(event);

        const dx =
            pos.x -
            lastPointerX;

        const dy =
            pos.y -
            lastPointerY;

        lastPointerX =
            pos.x;

        lastPointerY =
            pos.y;

        /*
         * MOVE NODE
         */

        if (
            draggingNode &&
            activeNode
        ) {
            const world =
                screenToWorld(
                    pos.x,
                    pos.y
                );

            activeNode.x =
                world.x +
                dragOffsetX;

            activeNode.y =
                world.y +
                dragOffsetY;

            draw();

            return;
        }

        /*
         * PAN MAP
         */

        if (panning) {
            viewX += dx;
            viewY += dy;

            draw();

            return;
        }

        /*
         * ROTATE 3D
         */

        if (
            rotating &&
            is3D
        ) {
            rotationY +=
                dx * 0.008;

            rotationX +=
                dy * 0.008;

            rotationX =
                Math.max(
                    -1.4,
                    Math.min(
                        1.4,
                        rotationX
                    )
                );

            draw();

            return;
        }

        hoveredNode =
            findNodeAt(
                pos.x,
                pos.y
            );

        if (hoveredNode) {
            canvas.style.cursor =
                "pointer";
        } else {
            canvas.style.cursor =
                "grab";
        }

        draw();
    }
);


/* =========================================================
   POINTER UP
========================================================= */

canvas.addEventListener(
    "pointerup",
    function(event) {
        if (
            draggingNode ||
            panning ||
            rotating
        ) {
            saveProject(false);
        }

        pointerDown = false;

        draggingNode = false;
        panning = false;
        rotating = false;

        activeNode = null;

        canvas.style.cursor =
            "grab";

        try {
            canvas.releasePointerCapture(
                event.pointerId
            );
        } catch (error) {
            /* ignore */
        }
    }
);

canvas.addEventListener(
    "pointercancel",
    function() {
        pointerDown = false;

        draggingNode = false;
        panning = false;
        rotating = false;

        activeNode = null;

        canvas.style.cursor =
            "grab";
    }
);


/* =========================================================
   RIGHT CLICK
========================================================= */

canvas.addEventListener(
    "contextmenu",
    function(event) {
        event.preventDefault();
    }
);


/* =========================================================
   WHEEL ZOOM
========================================================= */

canvas.addEventListener(
    "wheel",
    function(event) {
        if (!project) {
            return;
        }

        event.preventDefault();

        const pos =
            getCanvasPosition(event);

        const before =
            screenToWorld(
                pos.x,
                pos.y
            );

        const factor =
            event.deltaY < 0
                ? 1.1
                : 0.9;

        viewZoom *= factor;

        viewZoom =
            Math.max(
                0.25,
                Math.min(
                    3.5,
                    viewZoom
                )
            );

        const after =
            screenToWorld(
                pos.x,
                pos.y
            );

        viewX +=
            (
                before.x -
                after.x
            ) * viewZoom;

        viewY +=
            (
                before.y -
                after.y
            ) * viewZoom;

        draw();
    },
    {
        passive: false
    }
);


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
    "keydown",
    function(event) {
        const tag =
            event.target &&
            event.target.tagName;

        const editing =
            tag === "INPUT" ||
            tag === "TEXTAREA" ||
            tag === "SELECT";

        if (
            event.code === "Space" &&
            !editing
        ) {
            spacePressed = true;

            event.preventDefault();
        }

        if (editing) {
            if (
                event.key ===
                "Escape"
            ) {
                closeAddModal();
            }

            return;
        }

        if (
            event.key ===
                "Delete" ||
            event.key ===
                "Backspace"
        ) {
            deleteSelected();
        }

        if (
            event.key ===
            "Escape"
        ) {
            closeAddModal();

            const panel =
                document.getElementById(
                    "themePanel"
                );

            if (panel) {
                panel.classList.remove(
                    "open"
                );
            }

            clearSelection();
        }

        if (
            event.key.toLowerCase() ===
            "n"
        ) {
            openAddModal();
        }

        if (
            event.key.toLowerCase() ===
            "s"
        ) {
            saveProject(true);
        }

        /*
         * 2D / 3D
         *
         * Клавиша 3 переключает 3D.
         */

        if (
            event.key === "3"
        ) {
            toggle3D();
        }

        if (
            event.key === "2"
        ) {
            set3D(false);
        }
    }
);

document.addEventListener(
    "keyup",
    function(event) {
        if (
            event.code === "Space"
        ) {
            spacePressed = false;

            canvas.style.cursor =
                "grab";
        }
    }
);


/* =========================================================
   3D MODE
========================================================= */

function set3D(enabled) {
    is3D = Boolean(enabled);

    const button2D =
        document.getElementById(
            "view2D"
        );

    const button3D =
        document.getElementById(
            "view3D"
        );

    if (button2D) {
        button2D.classList.toggle(
            "active",
            !is3D
        );
    }

    if (button3D) {
        button3D.classList.toggle(
            "active",
            is3D
        );
    }

    const mode =
        document.getElementById(
            "viewMode"
        );

    if (mode) {
        mode.textContent =
            is3D ? "3D" : "2D";
    }

    canvas.style.cursor =
        "grab";

    draw();
}

function toggle3D() {
    set3D(!is3D);
}

function reset3D() {
    rotationX = -0.25;
    rotationY = 0.35;

    viewZoom = 1;

    viewX = 0;
    viewY = 0;

    draw();
}


/* =========================================================
   Z DEPTH
========================================================= */

function randomizeDepth() {
    if (!project) {
        return;
    }

    project.nodes.forEach(function(node) {
        node.z =
            Math.round(
                (Math.random() - 0.5) *
                500
            );
    });

    saveProject(false);

    draw();
}


/* =========================================================
   CENTER GRAPH
========================================================= */

function centerGraph() {
    if (
        !project ||
        project.nodes.length === 0
    ) {
        viewX = 0;
        viewY = 0;
        viewZoom = 1;

        draw();

        return;
    }

    let minX = Infinity;
    let maxX = -Infinity;

    let minY = Infinity;
    let maxY = -Infinity;

    project.nodes.forEach(function(node) {
        minX =
            Math.min(
                minX,
                node.x
            );

        maxX =
            Math.max(
                maxX,
                node.x
            );

        minY =
            Math.min(
                minY,
                node.y
            );

        maxY =
            Math.max(
                maxY,
                node.y
            );
    });

    const centerX =
        (minX + maxX) / 2;

    const centerY =
        (minY + maxY) / 2;

    viewX =
        -centerX * viewZoom;

    viewY =
        -centerY * viewZoom;

    draw();
}



/* =========================================================
   AUTO LAYOUT
========================================================= */

function autoLayout() {
    if (!project || !Array.isArray(project.nodes)) {
        return;
    }

    const nodes = project.nodes;
    const edges = Array.isArray(project.edges)
        ? project.edges
        : [];

    if (nodes.length < 2) {
        centerGraph();
        return;
    }

    const iterations = 80;
    const desiredDistance = 190;

    for (let iteration = 0; iteration < iterations; iteration++) {
        const forces = nodes.map(function() {
            return { x: 0, y: 0 };
        });

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i];
                const b = nodes[j];

                let dx = a.x - b.x;
                let dy = a.y - b.y;
                const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = 6500 / (distance * distance);

                dx /= distance;
                dy /= distance;

                forces[i].x += dx * force;
                forces[i].y += dy * force;
                forces[j].x -= dx * force;
                forces[j].y -= dy * force;
            }
        }

        edges.forEach(function(edge) {
            const source = nodes.find(function(node) {
                return node.id === edge.source || node.id === edge.from;
            });
            const target = nodes.find(function(node) {
                return node.id === edge.target || node.id === edge.to;
            });

            if (!source || !target) {
                return;
            }

            const sourceIndex = nodes.indexOf(source);
            const targetIndex = nodes.indexOf(target);

            let dx = target.x - source.x;
            let dy = target.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const difference = distance - desiredDistance;
            const force = difference * 0.012;

            dx /= distance;
            dy /= distance;

            forces[sourceIndex].x += dx * force;
            forces[sourceIndex].y += dy * force;
            forces[targetIndex].x -= dx * force;
            forces[targetIndex].y -= dy * force;
        });

        nodes.forEach(function(node, index) {
            forces[index].x += -node.x * 0.0007;
            forces[index].y += -node.y * 0.0007;

            node.x = Math.max(-1000, Math.min(1000, node.x + forces[index].x));
            node.y = Math.max(-700, Math.min(700, node.y + forces[index].y));
        });
    }

    centerGraph();
    saveProject(false);
    updateUI();
    showSavedStatus();
}


/* =========================================================
   ORBIT TOOL PANELS
========================================================= */

let orbitMap = null;
let orbitMapMarkers = [];
let orbitMapReady = false;

function closeOrbitPanels(exceptId) {
    [
        "mapPanel",
        "tempMailPanel",
        "analysisPanel",
        "timelinePanel"
    ].forEach(function(id) {
        if (id === exceptId) return;

        const panel = document.getElementById(id);
        if (panel) panel.style.display = "none";
    });

    const inspector = document.querySelector(".inspector");
    if (inspector) {
        inspector.style.visibility = exceptId ? "hidden" : "visible";
    }
}

function toggleWorldMap() {
    const panel = document.getElementById("mapPanel");
    if (!panel) return;

    const show = panel.style.display !== "block";

    if (!show) {
        panel.style.display = "none";
        const inspector = document.querySelector(".inspector");
        if (inspector) inspector.style.visibility = "visible";
        return;
    }

    closeOrbitPanels("mapPanel");
    panel.style.display = "block";
    initOrbitMap();

    if (orbitMap) {
        setTimeout(function() {
            orbitMap.invalidateSize();
        }, 80);
    }
}

function initOrbitMap() {
    const container = document.getElementById("orbitMap");
    if (!container || orbitMapReady) return;

    if (!window.L) {
        container.innerHTML = `
            <div class="map-load-error">
                Не удалось загрузить карту.<br>
                Проверь подключение к интернету.
            </div>
        `;
        return;
    }

    orbitMapReady = true;

    orbitMap = L.map(container, {
        zoomControl: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        dragging: true,
        worldCopyJump: true,
        minZoom: 2,
        maxZoom: 18
    }).setView([50, 15], 3);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution: "© OpenStreetMap contributors"
        }
    ).addTo(orbitMap);

    orbitMap.on("click", function(event) {
        addMapMarkerAt(event.latlng.lat, event.latlng.lng);
    });

    restoreMapMarkers();
}

function addMapMarker() {
    if (!orbitMap) {
        initOrbitMap();
    }

    if (!orbitMap) return;

    const latInput = prompt("Latitude (-90 ... 90):", "52.3676");
    if (latInput === null) return;

    const lngInput = prompt("Longitude (-180 ... 180):", "4.9041");
    if (lngInput === null) return;

    const lat = Number(latInput);
    const lng = Number(lngInput);

    if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
    ) {
        alert("Неверные координаты.");
        return;
    }

    addMapMarkerAt(lat, lng);
}

function addMapMarkerAt(latitude, longitude) {
    if (!orbitMap) return;

    const marker = L.marker([latitude, longitude]).addTo(orbitMap);

    marker.bindPopup(`
        <div style="font-size:12px;line-height:1.5">
            <strong>ORBIT LOCATION</strong><br>
            ${latitude.toFixed(5)}, ${longitude.toFixed(5)}<br><br>
            <button type="button" onclick="removeMapMarker(${orbitMapMarkers.length})">
                REMOVE
            </button>
        </div>
    `);

    orbitMapMarkers.push(marker);
    saveMapMarkers();
}

function removeMapMarker(index) {
    const marker = orbitMapMarkers[index];
    if (!marker || !orbitMap) return;

    orbitMap.removeLayer(marker);
    orbitMapMarkers.splice(index, 1);
    saveMapMarkers();
}

function clearMapMarkers() {
    orbitMapMarkers.forEach(function(marker) {
        if (orbitMap) orbitMap.removeLayer(marker);
    });

    orbitMapMarkers = [];
    saveMapMarkers();
}

function saveMapMarkers() {
    if (!project) return;

    project.mapMarkers = orbitMapMarkers.map(function(marker) {
        const position = marker.getLatLng();
        return {
            lat: position.lat,
            lng: position.lng
        };
    });

    if (typeof saveProject === "function") {
        saveProject(false);
    }
}

function restoreMapMarkers() {
    if (!orbitMap || !project) return;

    if (!Array.isArray(project.mapMarkers)) return;

    project.mapMarkers.forEach(function(item) {
        if (!item) return;

        const lat = Number(item.lat);
        const lng = Number(item.lng);

        if (
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            lat >= -90 && lat <= 90 &&
            lng >= -180 && lng <= 180
        ) {
            const marker = L.marker([lat, lng]).addTo(orbitMap);

            marker.bindPopup(`
                <div style="font-size:12px;line-height:1.5">
                    <strong>ORBIT LOCATION</strong><br>
                    ${lat.toFixed(5)}, ${lng.toFixed(5)}
                </div>
            `);

            orbitMapMarkers.push(marker);
        }
    });
}


/* =========================================================
   TEMP MAIL — UI ONLY
========================================================= */

function toggleTempMail() {
    const panel = document.getElementById("tempMailPanel");
    if (!panel) return;

    const show = panel.style.display !== "block";

    if (!show) {
        panel.style.display = "none";
        closeOrbitPanels(null);
        return;
    }

    closeOrbitPanels("tempMailPanel");
    panel.style.display = "block";
}

function generateTempMail() {
    const element = document.getElementById("tempMailAddress");
    if (!element) return;

    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    let local = "";

    for (let i = 0; i < 10; i++) {
        local += alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    element.textContent = `${local}@temp-mail.io`;

    const inbox = document.getElementById("tempMailInbox");
    if (inbox) {
        inbox.textContent = "Входящих писем пока нет.";
    }
}

function refreshTempMail() {
    const inbox = document.getElementById("tempMailInbox");
    if (inbox) {
        inbox.textContent = "Входящих писем пока нет.";
    }
}

function copyTempMail() {
    const element = document.getElementById("tempMailAddress");
    if (!element) return;

    const value = element.textContent || "";

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).catch(function() {});
        return;
    }

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
}


/* =========================================================
   ANALYSIS
========================================================= */

function toggleAnalysis() {
    const panel = document.getElementById("analysisPanel");
    if (!panel) return;

    const show = panel.style.display !== "block";

    if (!show) {
        panel.style.display = "none";
        closeOrbitPanels(null);
        return;
    }

    closeOrbitPanels("analysisPanel");
    panel.style.display = "block";
    updateAnalysis();
}

function updateAnalysis() {
    if (!project) return;

    const nodes = Array.isArray(project.nodes) ? project.nodes : [];
    const edges = Array.isArray(project.edges) ? project.edges : [];
    const degree = new Map();

    nodes.forEach(function(node) {
        degree.set(node.id, 0);
    });

    edges.forEach(function(edge) {
        if (degree.has(edge.source)) {
            degree.set(edge.source, degree.get(edge.source) + 1);
        }
        if (degree.has(edge.target)) {
            degree.set(edge.target, degree.get(edge.target) + 1);
        }
    });

    const locations = nodes.filter(function(node) {
        return String(node.type || "").toLowerCase() === "location";
    }).length;

    const isolated = nodes.filter(function(node) {
        return (degree.get(node.id) || 0) === 0;
    }).length;

    const setValue = function(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = String(value);
    };

    setValue("analysisNodes", nodes.length);
    setValue("analysisEdges", edges.length);
    setValue("analysisLocations", locations);
    setValue("analysisIsolated", isolated);

    const list = document.getElementById("mostConnected");

    if (list) {
        const top = [...nodes]
            .sort(function(a, b) {
                return (degree.get(b.id) || 0) - (degree.get(a.id) || 0);
            })
            .slice(0, 5);

        if (!top.length) {
            list.innerHTML = '<div class="analysis-empty">No data</div>';
        } else {
            list.innerHTML = top.map(function(node) {
                return `
                    <div class="analysis-row">
                        <span>${escapeHTML(node.name || "Entity")}</span>
                        <span>${degree.get(node.id) || 0}</span>
                    </div>
                `;
            }).join("");
        }
    }

    const selected = document.getElementById("selectedAnalysis");

    if (selected) {
        if (!selectedNode) {
            selected.textContent = "Выберите сущность на графе.";
        } else {
            const incoming = edges.filter(function(edge) {
                return edge.target === selectedNode.id;
            }).length;

            const outgoing = edges.filter(function(edge) {
                return edge.source === selectedNode.id;
            }).length;

            selected.innerHTML = `
                <strong>${escapeHTML(selectedNode.name || "Entity")}</strong><br>
                Connections: ${degree.get(selectedNode.id) || 0}<br>
                Incoming: ${incoming}<br>
                Outgoing: ${outgoing}
            `;
        }
    }
}


/* =========================================================
   TIMELINE
========================================================= */

function toggleTimeline() {
    const panel = document.getElementById("timelinePanel");
    if (!panel) return;

    const show = panel.style.display !== "block";

    if (!show) {
        panel.style.display = "none";
        closeOrbitPanels(null);
        return;
    }

    closeOrbitPanels("timelinePanel");
    panel.style.display = "block";
    updateTimeline();
}

function ensureTimeline() {
    if (!project) return [];

    if (!Array.isArray(project.timeline)) {
        project.timeline = [];
    }

    return project.timeline;
}

function addTimelineEvent(title, description, date) {
    if (!project) return;

    const timeline = ensureTimeline();

    timeline.push({
        id: uid(),
        date: date || new Date().toISOString(),
        title: title || "Event",
        description: description || ""
    });

    if (document.getElementById("timelinePanel")) {
        updateTimeline();
    }
}

function promptTimelineEvent() {
    if (!project) return;

    const title = prompt("Название события:", "Investigation event");
    if (title === null) return;

    const description = prompt("Описание:", "");
    if (description === null) return;

    addTimelineEvent(title, description);
    saveProject(false);
    updateTimeline();
}

function updateTimeline() {
    const list = document.getElementById("investigationTimeline");
    if (!list || !project) return;

    const events = ensureTimeline();

    if (!events.length) {
        list.innerHTML = '<div class="timeline-empty">No events</div>';
        return;
    }

    const sorted = [...events].sort(function(a, b) {
        return new Date(b.date) - new Date(a.date);
    });

    list.innerHTML = sorted.map(function(event) {
        return `
            <div class="timeline-item">
                <div class="timeline-date">
                    ${escapeHTML(formatTimelineDate(event.date))}
                </div>
                <div class="timeline-title">
                    ${escapeHTML(event.title || "Event")}
                </div>
                <div class="timeline-description">
                    ${escapeHTML(event.description || "")}
                </div>
            </div>
        `;
    }).join("");
}

function formatTimelineDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "UNKNOWN";
    }

    return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


/* =========================================================
   ZOOM BUTTONS
========================================================= */

function zoom(factor) {
    viewZoom *= factor;

    viewZoom =
        Math.max(
            0.25,
            Math.min(
                3.5,
                viewZoom
            )
        );

    draw();
}


/* =========================================================
   THEME
========================================================= */

function setTheme(
    color,
    save = true
) {
    document.documentElement.style.setProperty(
        "--accent",
        color
    );

    document.documentElement.style.setProperty(
        "--accent-2",
        color
    );

    if (project) {
        project.theme = color;

        if (save) {
            saveProject(false);
        }
    }

    draw();
}

function randomTheme() {
    const colors = [
        "#7c5cff",
        "#00d4ff",
        "#00e6a0",
        "#ff4fd8",
        "#ff8a3d",
        "#ff4567",
        "#e8ff3d",
        "#5b8cff",
        "#b47cff"
    ];

    const color =
        colors[
            Math.floor(
                Math.random() *
                colors.length
            )
        ];

    setTheme(color);
}

function toggleThemePanel() {
    const panel =
        document.getElementById(
            "themePanel"
        );

    if (panel) {
        panel.classList.toggle(
            "open"
        );
    }
}


/* =========================================================
   EXPORT
========================================================= */

function exportProject() {
    if (!project) {
        return;
    }

    const data =
        JSON.stringify(
            project,
            null,
            2
        );

    const blob =
        new Blob(
            [data],
            {
                type:
                    "application/json"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        safeFilename(
            project.name
        ) +
        ".json";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}


/* =========================================================
   IMPORT
========================================================= */

function importProject(event) {
    const file =
        event.target.files &&
        event.target.files[0];

    if (!file) {
        return;
    }

    const reader =
        new FileReader();

    reader.onload =
        function(loadEvent) {
            try {
                const imported =
                    JSON.parse(
                        loadEvent.target.result
                    );

                if (
                    !imported ||
                    !Array.isArray(
                        imported.nodes
                    ) ||
                    !Array.isArray(
                        imported.edges
                    )
                ) {
                    throw new Error(
                        "Invalid project"
                    );
                }

                imported.id = uid();

                imported.updatedAt =
                    Date.now();

                imported.nodes =
                    imported.nodes.map(
                        function(node) {
                            return {
                                id:
                                    node.id ||
                                    uid(),

                                name:
                                    node.name ||
                                    "Entity",

                                type:
                                    node.type ||
                                    "unknown",

                                value:
                                    node.value ||
                                    "",

                                source:
                                    node.source ||
                                    "",

                                note:
                                    node.note ||
                                    "",

                                x:
                                    Number(
                                        node.x
                                    ) || 0,

                                y:
                                    Number(
                                        node.y
                                    ) || 0,

                                z:
                                    Number(
                                        node.z
                                    ) || 0,

                                searchMatch:
                                    true
                            };
                        }
                    );

                project =
                    imported;

                setTheme(
                    project.theme ||
                    "#7c5cff",
                    false
                );

                saveProject(false);

                openApp();

                centerGraph();

            } catch (error) {
                alert(
                    "Не удалось импортировать проект."
                );
            }
        };

    reader.readAsText(file);

    event.target.value = "";
}


/* =========================================================
   ADDITIONAL UI BUTTONS
========================================================= */

function createViewControls() {
    if (!canvas) {
        return;
    }

    /*
     * Если в index.html уже есть кнопки
     * view2D / view3D — используем их.
     */

    const button2D =
        document.getElementById(
            "view2D"
        );

    const button3D =
        document.getElementById(
            "view3D"
        );

    if (button2D) {
        button2D.addEventListener(
            "click",
            function() {
                set3D(false);
            }
        );
    }

    if (button3D) {
        button3D.addEventListener(
            "click",
            function() {
                set3D(true);
            }
        );
    }
}


/* =========================================================
   STARTUP
========================================================= */

window.addEventListener(
    "resize",
    resizeCanvas
);

window.addEventListener(
    "beforeunload",
    function() {
        if (project) {
            saveProject(false);
        }
    }
);

createViewControls();

renderSaves();

if (canvas) {
    canvas.style.touchAction =
        "none";

    canvas.style.cursor =
        "grab";
}