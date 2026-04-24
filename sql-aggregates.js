// sql-aggregates.js
// Follow-up SQL tutorial focused on summary queries.

const aggregateState = {
    SQL: null,
    db: null,
    currentStepIndex: 0,
    lastSql: "",
    lastResultSets: [],
    storageKey: "sql-aggregates-progress-v1",
    completedSteps: []
};

const setupSql = `
PRAGMA foreign_keys = ON;

CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    customer_name TEXT NOT NULL,
    city TEXT NOT NULL
);

CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    order_date TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE order_lines (
    order_id INTEGER NOT NULL,
    line_no INTEGER NOT NULL,
    product TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    PRIMARY KEY (order_id, line_no),
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
);

CREATE TABLE shipments (
    order_id INTEGER NOT NULL,
    line_no INTEGER NOT NULL,
    shipped_qty INTEGER NOT NULL,
    carrier TEXT NOT NULL,
    PRIMARY KEY (order_id, line_no),
    FOREIGN KEY (order_id, line_no) REFERENCES order_lines(order_id, line_no)
);

INSERT INTO customers (customer_id, customer_name, city) VALUES
    (1, 'Ada Lovelace', 'Boston'),
    (2, 'Grace Hopper', 'New York'),
    (3, 'Linus Torvalds', 'Portland');

INSERT INTO orders (order_id, customer_id, order_date, status) VALUES
    (1001, 1, '2026-04-01', 'OPEN'),
    (1002, 1, '2026-04-03', 'SHIPPED'),
    (1003, 2, '2026-04-04', 'OPEN');

INSERT INTO order_lines (order_id, line_no, product, quantity, unit_price) VALUES
    (1001, 1, 'Notebook', 2, 4.50),
    (1001, 2, 'Pen', 5, 1.20),
    (1002, 1, 'Monitor', 1, 220.00),
    (1003, 1, 'Keyboard', 1, 75.00),
    (1003, 2, 'Cable', 3, 9.99);

INSERT INTO shipments (order_id, line_no, shipped_qty, carrier) VALUES
    (1002, 1, 1, 'SEA'),
    (1003, 1, 1, 'SEA'),
    (1003, 2, 3, 'AIR');
`;

function byId(id) {
    return document.getElementById(id);
}

function setStatus(message, tone) {
    const statusLine = byId("statusLine");
    statusLine.textContent = message;
    statusLine.className = `status-line${tone ? ` ${tone}` : ""}`;
}

function setLog(message) {
    byId("logArea").textContent = message;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function deepEqual(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeResultRows(rows) {
    return rows.map((row) => {
        const normalized = {};
        Object.keys(row).forEach((key) => {
            normalized[key] = row[key];
        });
        return normalized;
    });
}

function loadProgress() {
    try {
        const saved = JSON.parse(localStorage.getItem(aggregateState.storageKey) || "[]");
        aggregateState.completedSteps = Array.isArray(saved) ? saved : [];
    } catch {
        aggregateState.completedSteps = [];
    }
}

function saveProgress() {
    localStorage.setItem(aggregateState.storageKey, JSON.stringify(aggregateState.completedSteps));
}

function renderProgress() {
    const completedCount = aggregateState.completedSteps.length;
    const totalCount = steps.length;
    const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    byId("progressSummary").textContent = `${completedCount} of ${totalCount} exercises completed`;
    byId("progressFill").style.width = `${percent}%`;

    document.querySelectorAll(".step-button").forEach((button) => {
        const stepIndex = Number(button.dataset.stepIndex);
        button.classList.toggle("completed", aggregateState.completedSteps.includes(stepIndex));
    });
}

function markStepCompleted(stepIndex) {
    if (!aggregateState.completedSteps.includes(stepIndex)) {
        aggregateState.completedSteps.push(stepIndex);
        aggregateState.completedSteps.sort((left, right) => left - right);
        saveProgress();
        renderProgress();
    }
}

function resultSetsToObjects(resultSets) {
    return resultSets.map((resultSet) => {
        return resultSet.values.map((row) => {
            const rowObject = {};
            resultSet.columns.forEach((columnName, index) => {
                rowObject[columnName] = row[index];
            });
            return rowObject;
        });
    });
}

function renderResultSets(resultSets) {
    const resultArea = byId("resultArea");

    if (resultSets.length === 0) {
        resultArea.innerHTML = "<p>The SQL ran successfully. This statement changed the database but did not return rows.</p>";
        return;
    }

    const blocks = resultSets.map((resultSet, index) => {
        const header = `<p><strong>Result set ${index + 1}</strong></p>`;
        const headCells = resultSet.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
        const bodyRows = resultSet.values.map((row) => {
            const cells = row.map((value) => `<td>${escapeHtml(value)}</td>`).join("");
            return `<tr>${cells}</tr>`;
        }).join("");

        return `${header}<div class="table-wrap"><table><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
    });

    resultArea.innerHTML = blocks.join("");
}

function resetDatabase() {
    if (aggregateState.db) {
        aggregateState.db.close();
    }

    aggregateState.db = new aggregateState.SQL.Database();
    aggregateState.db.exec(setupSql);
    aggregateState.lastSql = "";
    aggregateState.lastResultSets = [];
    renderResultSets([]);
    setLog("Fresh in-memory SQLite database loaded with the sample order data.");
    setStatus("Database reset and sample data reloaded.", "warn");
}

function runSqlFromEditor() {
    const sql = byId("sqlEditor").value.trim();

    if (!sql) {
        setStatus("The editor is empty. Load starter SQL or type a query first.", "warn");
        return;
    }

    try {
        const resultSets = aggregateState.db.exec(sql);
        aggregateState.lastSql = sql;
        aggregateState.lastResultSets = resultSetsToObjects(resultSets);
        renderResultSets(resultSets);
        setLog(`Executed SQL:\n\n${sql}`);
        setStatus("SQL ran successfully. Review the grouped results, then check the exercise.", "good");
    } catch (error) {
        setStatus(`SQL error: ${error.message}`, "bad");
        setLog(`SQL failed:\n\n${sql}\n\n${error.message}`);
    }
}

function loadStarterSql() {
    byId("sqlEditor").value = steps[aggregateState.currentStepIndex].starterSql;
    setStatus("Starter SQL loaded into the editor.", "warn");
}

function goToStep(index) {
    aggregateState.currentStepIndex = index;

    const step = steps[index];
    byId("stepTitle").textContent = `${index + 1}. ${step.title}`;
    byId("stepObjective").textContent = step.objective;
    byId("stepConcept").textContent = step.concept;
    byId("stepInstructions").textContent = step.instructions;

    document.querySelectorAll(".step-button").forEach((button, buttonIndex) => {
        button.classList.toggle("active", buttonIndex === index);
    });
}

function moveToNextStep() {
    const nextIndex = Math.min(aggregateState.currentStepIndex + 1, steps.length - 1);
    goToStep(nextIndex);
    loadStarterSql();
}

function expectedSingleResult() {
    return normalizeResultRows(aggregateState.lastResultSets[0] || []);
}

function checkCurrentStep() {
    const step = steps[aggregateState.currentStepIndex];
    const outcome = step.validate();

    if (outcome.ok) {
        markStepCompleted(aggregateState.currentStepIndex);
        setStatus(outcome.message, "good");
    } else {
        setStatus(outcome.message, "bad");
    }
}

const steps = [
    {
        title: "Count orders by status",
        objective: "Summarize how many orders are OPEN and how many are SHIPPED.",
        concept: "COUNT with GROUP BY is the fastest way to turn many detail rows into a category summary.",
        instructions: "Write a query that returns status and order_count from the orders table, grouped by status and ordered by status.",
        starterSql: `SELECT
    status,
    COUNT(*) AS order_count
FROM orders
GROUP BY status
ORDER BY status;`,
        validate() {
            const expected = [
                { status: "OPEN", order_count: 2 },
                { status: "SHIPPED", order_count: 1 }
            ];

            if (deepEqual(expectedSingleResult(), expected)) {
                return { ok: true, message: "Correct. COUNT and GROUP BY produced the expected status summary." };
            }

            return { ok: false, message: "The status counts do not match the sample data." };
        }
    },
    {
        title: "Sum line totals per order",
        objective: "Calculate the total dollar amount for each order.",
        concept: "SUM often combines multiple detail rows into one business number, such as a total invoice or total order value.",
        instructions: "Return order_id and order_total from order_lines, where order_total is SUM(quantity * unit_price), ordered by order_id.",
        starterSql: `SELECT
    order_id,
    ROUND(SUM(quantity * unit_price), 2) AS order_total
FROM order_lines
GROUP BY order_id
ORDER BY order_id;`,
        validate() {
            const expected = [
                { order_id: 1001, order_total: 15 },
                { order_id: 1002, order_total: 220 },
                { order_id: 1003, order_total: 104.97 }
            ];

            if (deepEqual(expectedSingleResult(), expected)) {
                return { ok: true, message: "Correct. Each order total matches the sum of its line items." };
            }

            return { ok: false, message: "The per-order totals are not correct yet. Re-check the SUM expression and GROUP BY." };
        }
    },
    {
        title: "Group totals by customer",
        objective: "Use joins plus aggregation to total purchases per customer.",
        concept: "Real reports often combine joins and grouping. You join detail rows first, then summarize them by the dimension you care about.",
        instructions: "Join customers, orders, and order_lines. Return customer_name and total_spent, grouped by customer_name and ordered by total_spent descending.",
        starterSql: `SELECT
    c.customer_name,
    ROUND(SUM(ol.quantity * ol.unit_price), 2) AS total_spent
FROM customers AS c
JOIN orders AS o
    ON o.customer_id = c.customer_id
JOIN order_lines AS ol
    ON ol.order_id = o.order_id
GROUP BY c.customer_id, c.customer_name
ORDER BY total_spent DESC;`,
        validate() {
            const expected = [
                { customer_name: "Ada Lovelace", total_spent: 235 },
                { customer_name: "Grace Hopper", total_spent: 104.97 }
            ];

            if (deepEqual(expectedSingleResult(), expected)) {
                return { ok: true, message: "Correct. The join-and-group report matches the sample data." };
            }

            return { ok: false, message: "The customer totals do not match. Check the join path and SUM expression." };
        }
    },
    {
        title: "Filter groups with HAVING",
        objective: "Return only customers whose total spending is greater than 100.",
        concept: "WHERE filters individual rows before grouping. HAVING filters the grouped result after aggregation is complete.",
        instructions: "Build on the grouped customer total query and use HAVING so that only totals above 100 remain. Order by total_spent descending.",
        starterSql: `SELECT
    c.customer_name,
    ROUND(SUM(ol.quantity * ol.unit_price), 2) AS total_spent
FROM customers AS c
JOIN orders AS o
    ON o.customer_id = c.customer_id
JOIN order_lines AS ol
    ON ol.order_id = o.order_id
GROUP BY c.customer_id, c.customer_name
HAVING SUM(ol.quantity * ol.unit_price) > 100
ORDER BY total_spent DESC;`,
        validate() {
            const expected = [
                { customer_name: "Ada Lovelace", total_spent: 235 },
                { customer_name: "Grace Hopper", total_spent: 104.97 }
            ];

            if (deepEqual(expectedSingleResult(), expected)) {
                return { ok: true, message: "Correct. HAVING filtered the grouped rows after aggregation." };
            }

            return { ok: false, message: "The HAVING result does not match. Make sure the filter is applied after GROUP BY, not in WHERE." };
        }
    },
    {
        title: "Average shipped quantity by carrier",
        objective: "Compute an average for each shipping carrier.",
        concept: "AVG is another aggregate function. It is useful for rates and typical values rather than totals.",
        instructions: "Write a query that returns carrier and avg_shipped_qty from shipments, grouped by carrier and ordered by carrier.",
        starterSql: `SELECT
    carrier,
    ROUND(AVG(shipped_qty), 2) AS avg_shipped_qty
FROM shipments
GROUP BY carrier
ORDER BY carrier;`,
        validate() {
            const expected = [
                { carrier: "AIR", avg_shipped_qty: 3 },
                { carrier: "SEA", avg_shipped_qty: 1 }
            ];

            if (deepEqual(expectedSingleResult(), expected)) {
                return { ok: true, message: "Correct. You now have COUNT, SUM, HAVING, and AVG covered." };
            }

            return { ok: false, message: "The carrier averages do not match the shipment data." };
        }
    }
];

function renderStepButtons() {
    const html = steps.map((step, index) => {
        return `
            <button type="button" class="step-button" data-step-index="${index}">
                <strong>${index + 1}. ${escapeHtml(step.title)}</strong>
                <small>${escapeHtml(step.objective)}</small>
            </button>
        `;
    }).join("");

    byId("stepList").innerHTML = html;

    document.querySelectorAll(".step-button").forEach((button) => {
        button.addEventListener("click", () => {
            const stepIndex = Number(button.dataset.stepIndex);
            goToStep(stepIndex);
            loadStarterSql();
        });
    });

    renderProgress();
}

async function initTutorial() {
    setStatus("Loading sql.js. This may take a moment the first time.", "warn");

    aggregateState.SQL = await initSqlJs({
        locateFile(fileName) {
            return `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${fileName}`;
        }
    });

    loadProgress();
    renderStepButtons();
    resetDatabase();
    goToStep(0);
    loadStarterSql();

    byId("loadStarterButton").addEventListener("click", loadStarterSql);
    byId("runSqlButton").addEventListener("click", runSqlFromEditor);
    byId("checkStepButton").addEventListener("click", checkCurrentStep);
    byId("nextStepButton").addEventListener("click", moveToNextStep);
    byId("resetDbButton").addEventListener("click", () => {
        resetDatabase();
        goToStep(0);
        loadStarterSql();
    });
}

window.addEventListener("DOMContentLoaded", () => {
    initTutorial().catch((error) => {
        setStatus(`Could not load the SQL engine: ${error.message}`, "bad");
        setLog(`Startup failed:\n\n${error.message}`);
    });
});