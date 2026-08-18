const defaultState = {
	income: 6200,
	expenses: [
		{ name: "Housing", amount: 1800 },
		{ name: "Food & dining", amount: 620 },
		{ name: "Transport", amount: 310 },
		{ name: "Subscriptions", amount: 140 }
	],
	startingBalance: 12000,
	returnRate: 7,
	monthlyContribution: 1000,
	years: 5
};

let state = loadState();
let growthChart;
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function loadState() {
	try { return { ...defaultState, ...JSON.parse(localStorage.getItem("northstar-finance")) }; }
	catch { return { ...defaultState }; }
}

function saveState() { localStorage.setItem("northstar-finance", JSON.stringify(state)); }
function formatMoney(value) { return money.format(Math.max(0, value)); }
function expenseTotal() { return state.expenses.reduce((total, expense) => total + Number(expense.amount || 0), 0); }

function renderExpenses() {
	const list = document.querySelector("#expenseList");
	list.innerHTML = state.expenses.map((expense, index) => `
		<div class="expense-row" data-index="${index}">
			<input class="form-control expense-name" aria-label="Expense category" value="${expense.name}">
			<div class="input-group input-group-sm expense-amount"><span class="input-group-text">$</span><input class="form-control" aria-label="Expense amount" type="number" min="0" step="10" value="${expense.amount}"></div>
			<button type="button" class="remove-expense" aria-label="Remove ${expense.name}"><i class="bi bi-x-lg"></i></button>
		</div>`).join("");
	list.querySelectorAll(".expense-row").forEach(row => {
		const index = Number(row.dataset.index);
		row.querySelector(".expense-name").addEventListener("input", event => { state.expenses[index].name = event.target.value; saveState(); });
		row.querySelector(".expense-amount input").addEventListener("input", event => { state.expenses[index].amount = Number(event.target.value) || 0; updateDashboard(); saveState(); });
		row.querySelector(".remove-expense").addEventListener("click", () => { state.expenses.splice(index, 1); renderExpenses(); updateDashboard(); saveState(); });
	});
}

function calculateProjection() {
	const months = Number(state.years) * 12;
	const monthlyRate = Number(state.returnRate) / 100 / 12;
	let balance = Number(state.startingBalance) || 0;
	const balances = [balance];
	const contributions = [Number(state.startingBalance) || 0];
	for (let month = 1; month <= months; month += 1) {
		balance = balance * (1 + monthlyRate) + Number(state.monthlyContribution || 0);
		balances.push(balance);
		contributions.push((Number(state.startingBalance) || 0) + month * Number(state.monthlyContribution || 0));
	}
	return { balances, contributions, balance, contributionsTotal: contributions[contributions.length - 1] };
}

function updateDashboard() {
	const income = Number(state.income) || 0;
	const expenses = expenseTotal();
	const surplus = income - expenses;
	const rate = income > 0 ? Math.max(0, surplus / income * 100) : 0;
	const projection = calculateProjection();
	document.querySelector("#expenseTotal").textContent = `${formatMoney(expenses)} total`;
	document.querySelector("#availableValue").textContent = formatMoney(surplus);
	document.querySelector("#surplusValue").textContent = formatMoney(surplus);
	document.querySelector("#savingsRateValue").textContent = `${Math.round(rate)}%`;
	document.querySelector("#savingsProgress").style.width = `${Math.min(rate / 20 * 100, 100)}%`;
	document.querySelector("#netWorthValue").textContent = formatMoney(projection.balance);
	document.querySelector("#growthValue").textContent = formatMoney(projection.balance - projection.contributionsTotal);
	document.querySelector("#projectedBalance").textContent = formatMoney(projection.balance);
	document.querySelector("#totalContributions").textContent = formatMoney(projection.contributionsTotal);
	document.querySelector("#investmentGains").textContent = formatMoney(projection.balance - projection.contributionsTotal);
	renderChart(projection);
}

function renderChart(projection) {
	const labels = Array.from({ length: Number(state.years) + 1 }, (_, year) => `Year ${year}`);
	const pointsPerYear = 12;
	const balanceData = labels.map((_, year) => projection.balances[Math.min(year * pointsPerYear, projection.balances.length - 1)]);
	const contributionData = labels.map((_, year) => projection.contributions[Math.min(year * pointsPerYear, projection.contributions.length - 1)]);
	if (growthChart) growthChart.destroy();
	growthChart = new Chart(document.querySelector("#growthChart"), {
		type: "line",
		data: { labels, datasets: [
			{ label: "Estimated balance", data: balanceData, borderColor: "#287951", backgroundColor: "rgba(184,232,202,.24)", fill: true, tension: .38, pointRadius: 3, pointBackgroundColor: "#287951" },
			{ label: "Contributions", data: contributionData, borderColor: "#f2c75c", borderDash: [5, 5], fill: false, tension: .25, pointRadius: 2, pointBackgroundColor: "#f2c75c" }
		]},
		options: { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: context => ` ${context.dataset.label}: ${formatMoney(context.parsed.y)}` } } }, scales: { x: { grid: { display: false }, ticks: { color: "#89938d", font: { family: "DM Sans", size: 10 } } }, y: { beginAtZero: false, grid: { color: "#edf1ec" }, ticks: { color: "#89938d", font: { family: "DM Sans", size: 10 }, callback: value => `$${Math.round(value / 1000)}k` } } } }
	});
}

document.addEventListener("DOMContentLoaded", () => {
	document.querySelector("#income").value = state.income;
	document.querySelector("#startingBalance").value = state.startingBalance;
	document.querySelector("#returnRate").value = state.returnRate;
	document.querySelector("#monthlyContribution").value = state.monthlyContribution;
	document.querySelector("#years").value = state.years;
	renderExpenses();
	["income", "startingBalance", "returnRate", "monthlyContribution", "years"].forEach(id => document.querySelector(`#${id}`).addEventListener("input", event => { state[id] = Number(event.target.value); updateDashboard(); saveState(); }));
	document.querySelector("#financeForm").addEventListener("submit", event => { event.preventDefault(); updateDashboard(); saveState(); });
	document.querySelector("#addExpense").addEventListener("click", () => { state.expenses.push({ name: "New category", amount: 0 }); renderExpenses(); updateDashboard(); saveState(); });
	document.querySelector("#resetButton").addEventListener("click", () => { state = JSON.parse(JSON.stringify(defaultState)); saveState(); window.location.reload(); });
	updateDashboard();
});
