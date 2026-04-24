// sql-tutorial.js
// Guided SQL practice in the browser using sql.js.
// The goal here is readability for people who are learning both SQL and JavaScript.

const tutorialState = {
    SQL: null,
    db: null,
    currentStepIndex: 0,
    lastSql: "",
    lastResultSets: [],
    storageKey: "sql-tutorial-progress-v1",
    completedSteps: []
};

// Small wrappers keep the rest of the file easy to read.
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

function loadProgress() {
    try {
        const saved = JSON.parse(localStorage.getItem(tutorialState.storageKey) || "[]");
        tutorialState.completedSteps = Array.isArray(saved) ? saved : [];
    } catch {
        tutorialState.completedSteps = [];
    }
}

function saveProgress() {
    localStorage.setItem(tutorialState.storageKey, JSON.stringify(tutorialState.completedSteps));
}

function renderProgress() {
    const completedCount = tutorialState.completedSteps.length;
    const totalCount = steps.length;
    const percent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    byId("progressSummary").textContent = `${completedCount} of ${totalCount} exercises completed`;
    byId("progressFill").style.width = `${percent}%`;

    document.querySelectorAll(".step-button").forEach((button) => {
        const stepIndex = Number(button.dataset.stepIndex);
        button.classList.toggle("completed", tutorialState.completedSteps.includes(stepIndex));
    });
}

function markStepCompleted(stepIndex) {
    if (!tutorialState.completedSteps.includes(stepIndex)) {
        tutorialState.completedSteps.push(stepIndex);
        tutorialState.completedSteps.sort((left, right) => left - right);
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

function queryRows(sql) {
    const resultSets = tutorialState.db.exec(sql);
    const rowGroups = resultSetsToObjects(resultSets);
    return rowGroups[0] || [];
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

function normalizeResultRows(rows) {
    return rows.map((row) => {
        const normalized = {};
        Object.keys(row).forEach((key) => {
            normalized[key] = row[key];
        });
        return normalized;
    });
}

function resetDatabase() {
    if (tutorialState.db) {
        tutorialState.db.close();
    }

    tutorialState.db = new tutorialState.SQL.Database();
    tutorialState.lastSql = "";
    tutorialState.lastResultSets = [];
    renderResultSets([]);
    setLog("Fresh in-memory SQLite database ready. Use the starter SQL for Exercise 1.");
    setStatus("Database reset. Start with Exercise 1 or load the starter SQL for your current exercise.", "warn");
}

function runSqlFromEditor() {
    const sql = byId("sqlEditor").value.trim();

    if (!sql) {
        setStatus("The editor is empty. Load starter SQL or type a query first.", "warn");
        return;
    }

    try {
        const resultSets = tutorialState.db.exec(sql);
        tutorialState.lastSql = sql;
        tutorialState.lastResultSets = resultSetsToObjects(resultSets);
        renderResultSets(resultSets);
        setLog(`Executed SQL:\n\n${sql}`);
        setStatus("SQL ran successfully. Review the results, then check the exercise.", "good");
    } catch (error) {
        setStatus(`SQL error: ${error.message}`, "bad");
        setLog(`SQL failed:\n\n${sql}\n\n${error.message}`);
    }
}

function loadStarterSql() {
    byId("sqlEditor").value = steps[tutorialState.currentStepIndex].starterSql;
    setStatus("Starter SQL loaded into the editor.", "warn");
}

function goToStep(index) {
    tutorialState.currentStepIndex = index;

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
    const nextIndex = Math.min(tutorialState.currentStepIndex + 1, steps.length - 1);
    goToStep(nextIndex);
    loadStarterSql();
}

function expectedSingleResult() {
    return normalizeResultRows(tutorialState.lastResultSets[0] || []);
}

function checkCurrentStep() {
    const step = steps[tutorialState.currentStepIndex];
    const outcome = step.validate();

    if (outcome.ok) {
        markStepCompleted(tutorialState.currentStepIndex);
        setStatus(outcome.message, "good");
    } else {
        setStatus(outcome.message, "bad");
    }
}

const steps = [
    {
        title: "Create the schema",
        objective: "Create four related tables: customers, orders, order_lines, and shipments.",
        concept: "Good SQL work starts with a clear schema. Primary keys identify rows, and foreign keys connect the parent and child tables.",
        instructions: "Run SQL that creates the four tutorial tables. Keep foreign keys turned on so the database can enforce relationships.",
        starterSql: `-- Exercise 1: Create the tables for a tiny order system.
-- Customers are the parent records.
-- Orders belong to a customer.
-- Order lines belong to an order.
-- Shipments match an order line by both order_id and line_no.

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
);`,
        validate() {
            const rows = queryRows(`
                SELECT name
                FROM sqlite_master
                WHERE type = 'table'
                  AND name IN ('customers', 'orders', 'order_lines', 'shipments')
                ORDER BY name;
            `);

            const names = rows.map((row) => row.name);
            const expected = ["customers", "order_lines", "orders", "shipments"];

            if (deepEqual(names, expected)) {
                return { ok: true, message: "Schema looks correct. The tutorial tables are ready." };
            }

            return { ok: false, message: "The four tutorial tables are not all present yet. Re-run or fix the CREATE TABLE statements." };
        }
    },
    {
        title: "Insert starter data",
        objective: "Fill the tables with a small but realistic set of rows.",
        concept: "Insert statements give you data to query against. This exercise also reinforces the parent-child relationship between tables.",
        instructions: "Insert the sample customers, orders, order lines, and shipments shown in the starter SQL. The inserts should work only after Exercise 1 succeeds.",
        starterSql: `-- Exercise 2: Insert rows into the tables.
-- This gives us a parent table, a child table, and a grandchild table.

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
    (1003, 2, 3, 'AIR');`,
        validate() {
            const counts = queryRows(`
                SELECT 'customers' AS table_name, COUNT(*) AS row_count FROM customers
                UNION ALL
                SELECT 'orders', COUNT(*) FROM orders
                UNION ALL
                SELECT 'order_lines', COUNT(*) FROM order_lines
                UNION ALL
                SELECT 'shipments', COUNT(*) FROM shipments;
            `);

            const expected = [
                { table_name: "customers", row_count: 3 },
                { table_name: "orders", row_count: 3 },
                { table_name: "order_lines", row_count: 5 },
                { table_name: "shipments", row_count: 3 }
            ];

            if (deepEqual(normalizeResultRows(counts), expected)) {
                return { ok: true, message: "Starter data inserted. You now have rows to query and modify." };
            }

            return { ok: false, message: "The row counts do not match the sample data yet. Check the INSERT statements and foreign-key order." };
        }
    },
    {
        title: "Basic SELECT with WHERE and ORDER BY",
        objective: "Query the customers table and return a clean, ordered result.",
        concept: "A useful first SQL pattern is selecting a few columns, filtering with WHERE, and controlling display order with ORDER BY.",
        instructions: "Write a SELECT that returns only the customer_name and city columns for customer IDs 1 and 2, ordered by customer_id.",
        starterSql: `-- Exercise 3: Query a single table.
-- Return customer_name and city for customer_id 1 and 2.
-- Order the rows by customer_id.

SELECT
    customer_name,
    city
FROM customers
WHERE customer_id <= 2
ORDER BY customer_id;`,
        validate() {
            const expected = [
                { customer_name: "Ada Lovelace", city: "Boston" },
                { customer_name: "Grace Hopper", city: "New York" }
            ];

            if (deepEqual(expectedSingleResult(), expected)) {
                return { ok: true, message: "That SELECT is correct. You filtered rows and ordered them cleanly." };
            }

            return { ok: false, message: "The result set is not the expected two-row customer list. Re-check the selected columns, filter, and ORDER BY." };
        }
    },
    {
        title: "Delete a record",
        objective: "Remove the Portland customer, who does not have any orders.",
        concept: "DELETE changes table state instead of returning rows. After a DELETE, you often verify the effect with another SELECT.",
        instructions: "Delete the customer whose name is Linus Torvalds or whose city is Portland. After that row is gone, the customers table should contain only two rows.",
        starterSql: `-- Exercise 4: Delete one row.
-- Linus has no orders, so this is a safe delete.

DELETE FROM customers
WHERE customer_name = 'Linus Torvalds';`,
        validate() {
            const remaining = queryRows(`
                SELECT customer_name, city
                FROM customers
                ORDER BY customer_id;
            `);

            const expected = [
                { customer_name: "Ada Lovelace", city: "Boston" },
                { customer_name: "Grace Hopper", city: "New York" }
            ];

            if (deepEqual(normalizeResultRows(remaining), expected)) {
                return { ok: true, message: "Delete confirmed. The Portland customer has been removed." };
            }

            return { ok: false, message: "The customers table still does not match the expected two remaining rows." };
        }
    },
    {
        title: "Join parent and child tables",
        objective: "Return each OPEN order together with the customer who placed it.",
        concept: "An inner join connects related rows. Here, orders is the child table and customers is the parent table.",
        instructions: "Write a query that returns customer_name, order_id, and status for only OPEN orders. Join customers to orders on customer_id and order by order_id.",
        starterSql: `-- Exercise 5: Join customers to orders.

SELECT
    c.customer_name,
    o.order_id,
    o.status
FROM customers AS c
JOIN orders AS o
    ON o.customer_id = c.customer_id
WHERE o.status = 'OPEN'
ORDER BY o.order_id;`,
        validate() {
            const expected = [
                { customer_name: "Ada Lovelace", order_id: 1001, status: "OPEN" },
                { customer_name: "Grace Hopper", order_id: 1003, status: "OPEN" }
            ];

            if (deepEqual(expectedSingleResult(), expected)) {
                return { ok: true, message: "Join verified. You connected parent and child records correctly." };
            }

            return { ok: false, message: "The joined result is not the expected list of OPEN orders." };
        }
    },
    {
        title: "Join on multiple fields",
        objective: "Match shipments to order lines using both order_id and line_no.",
        concept: "Sometimes one column is not enough to identify the related row. Composite keys and multi-column joins are common in real databases.",
        instructions: "Write a query that joins order_lines to shipments on both order_id and line_no. Return order_id, line_no, product, shipped_qty, and carrier, ordered by order_id and line_no.",
        starterSql: `-- Exercise 6: Join on multiple fields.

SELECT
    ol.order_id,
    ol.line_no,
    ol.product,
    s.shipped_qty,
    s.carrier
FROM order_lines AS ol
JOIN shipments AS s
    ON s.order_id = ol.order_id
   AND s.line_no = ol.line_no
ORDER BY ol.order_id, ol.line_no;`,
        validate() {
            const expected = [
                { order_id: 1002, line_no: 1, product: "Monitor", shipped_qty: 1, carrier: "SEA" },
                { order_id: 1003, line_no: 1, product: "Keyboard", shipped_qty: 1, carrier: "SEA" },
                { order_id: 1003, line_no: 2, product: "Cable", shipped_qty: 3, carrier: "AIR" }
            ];

            if (deepEqual(expectedSingleResult(), expected)) {
                return { ok: true, message: "Multi-column join verified. The composite key match is correct." };
            }

            return { ok: false, message: "The result set does not match the expected shipment-to-line join." };
        }
    },
    {
        title: "Reorder equivalent inner joins",
        objective: "Rewrite a three-table inner join starting from a different table and get the same result.",
        concept: "You must still keep valid SQL syntax with FROM first. But for inner joins, you can often change the table order and preserve the same logic and result set.",
        instructions: "Write a query that starts with FROM order_lines AS ol, then joins orders and customers, and returns customer_name, order_id, and product for Boston customers. Order by order_id and line_no. The rows should match the same logic you would get if you started from customers instead.",
        starterSql: `-- Exercise 7: Reorder the inner joins.
-- Important: you still need FROM before JOIN.
-- Start from order_lines this time.

SELECT
    c.customer_name,
    o.order_id,
    ol.product
FROM order_lines AS ol
JOIN orders AS o
    ON o.order_id = ol.order_id
JOIN customers AS c
    ON c.customer_id = o.customer_id
WHERE c.city = 'Boston'
ORDER BY o.order_id, ol.line_no;`,
        validate() {
            const lastSqlStartsFromOrderLines = /from\s+order_lines\s+as\s+ol|from\s+order_lines\s+ol/i.test(tutorialState.lastSql);
            const actual = expectedSingleResult();
            const reference = normalizeResultRows(queryRows(`
                SELECT
                    c.customer_name,
                    o.order_id,
                    ol.product
                FROM customers AS c
                JOIN orders AS o
                    ON o.customer_id = c.customer_id
                JOIN order_lines AS ol
                    ON ol.order_id = o.order_id
                WHERE c.city = 'Boston'
                ORDER BY o.order_id, ol.line_no;
            `));

            if (!lastSqlStartsFromOrderLines) {
                return { ok: false, message: "The exercise asks you to start from order_lines in the FROM clause. Reorder the join chain and run it again." };
            }

            if (deepEqual(actual, reference)) {
                return { ok: true, message: "Same rows, different inner-join order. That is the point of the exercise." };
            }

            return { ok: false, message: "The results do not match the reference inner join yet. Check the join conditions and ORDER BY." };
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

    tutorialState.SQL = await initSqlJs({
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