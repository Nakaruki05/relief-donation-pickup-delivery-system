const STORAGE_KEY = "relieflink_donation_requests_v1";

const statusSteps = [
  "Pending",
  "Accepted / Assigned",
  "Picked Up",
  "Out for Delivery",
  "Delivered"
];

const donationForm = document.getElementById("donationForm");
const donationList = document.getElementById("donationList");
const formMessage = document.getElementById("formMessage");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const pickupDate = document.getElementById("pickupDate");

function getDonations() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error("Could not read saved donation requests.", error);
    return [];
  }
}

function saveDonations(donations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(donations));
}

function makeId() {
  return "RL-" + Date.now().toString().slice(-7);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (character) {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return replacements[character];
  });
}

function updateStats(donations) {
  document.getElementById("totalCount").textContent = donations.length;
  document.getElementById("deliveredCount").textContent =
    donations.filter(item => item.status === "Delivered").length;
  document.getElementById("pendingCount").textContent =
    donations.filter(item => item.status === "Pending").length;
}

function getStatusClass(status) {
  if (status === "Delivered") return "delivered";
  if (status === "Cancelled") return "cancelled";
  return "";
}

function renderDonations() {
  const donations = getDonations();
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  updateStats(donations);

  const filtered = donations.filter(item => {
    const searchableText = [
      item.id, item.donorName, item.donationType, item.pickupLocation,
      item.destination, item.description
    ].join(" ").toLowerCase();
    const matchesSearch = searchableText.includes(searchTerm);
    const matchesStatus = selectedStatus === "All" || item.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    donationList.innerHTML = '<div class="empty-state"><strong>No donation requests found.</strong><br>Submit a request above or change your search/filter.</div>';
    return;
  }

  donationList.innerHTML = filtered.map(item => {
    const isFinal = item.status === "Delivered" || item.status === "Cancelled";
    const currentStep = statusSteps.indexOf(item.status);
    let actionButtons = "";

    if (!isFinal) {
      actionButtons += '<button class="small-button" data-action="next" data-id="' + escapeHTML(item.id) + '">Advance Status</button>';
      actionButtons += '<button class="small-button danger" data-action="cancel" data-id="' + escapeHTML(item.id) + '">Cancel</button>';
    }
    actionButtons += '<button class="small-button danger" data-action="delete" data-id="' + escapeHTML(item.id) + '">Delete Demo</button>';

    const description = item.description
      ? '<p class="description">' + escapeHTML(item.description) + '</p>'
      : "";

    return `
      <article class="donation-card">
        <div>
          <h3>${escapeHTML(item.donationType)} · ${escapeHTML(item.quantity)} package(s)</h3>
          <div class="donation-meta">
            <span><strong>Request:</strong> ${escapeHTML(item.id)}</span>
            <span><strong>Donor:</strong> ${escapeHTML(item.donorName)}</span>
            <span><strong>Pickup date:</strong> ${escapeHTML(item.pickupDate)}</span>
            <span><strong>Pickup:</strong> ${escapeHTML(item.pickupLocation)}</span>
            <span><strong>Destination:</strong> ${escapeHTML(item.destination)}</span>
          </div>
          ${description}
          <div class="card-actions">${actionButtons}</div>
        </div>
        <span class="status-pill ${getStatusClass(item.status)}">${escapeHTML(item.status)}</span>
      </article>
    `;
  }).join("");
}

donationForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const donation = {
    id: makeId(),
    donorName: document.getElementById("donorName").value.trim(),
    donorEmail: document.getElementById("donorEmail").value.trim(),
    donationType: document.getElementById("donationType").value,
    quantity: document.getElementById("quantity").value,
    pickupDate: document.getElementById("pickupDate").value,
    pickupLocation: document.getElementById("pickupLocation").value.trim(),
    destination: document.getElementById("destination").value.trim(),
    description: document.getElementById("description").value.trim(),
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  if (!donation.donorName || !donation.donorEmail || !donation.donationType ||
      !donation.quantity || !donation.pickupDate || !donation.pickupLocation ||
      !donation.destination) {
    formMessage.textContent = "Please complete all required fields.";
    formMessage.className = "form-message error";
    return;
  }

  const donations = getDonations();
  donations.unshift(donation);
  saveDonations(donations);

  formMessage.textContent = "Request submitted in this browser. Your request ID is " + donation.id + ".";
  formMessage.className = "form-message success";
  donationForm.reset();
  renderDonations();
  document.getElementById("tracking").scrollIntoView({ behavior: "smooth" });
});

donationList.addEventListener("click", function (event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  let donations = getDonations();
  const index = donations.findIndex(item => item.id === id);
  if (index === -1) return;

  if (action === "next") {
    const currentIndex = statusSteps.indexOf(donations[index].status);
    if (currentIndex >= 0 && currentIndex < statusSteps.length - 1) {
      donations[index].status = statusSteps[currentIndex + 1];
    }
  } else if (action === "cancel") {
    donations[index].status = "Cancelled";
  } else if (action === "delete") {
    const shouldDelete = window.confirm("Delete this demo request from this browser?");
    if (!shouldDelete) return;
    donations = donations.filter(item => item.id !== id);
  }

  saveDonations(donations);
  renderDonations();
});

searchInput.addEventListener("input", renderDonations);
statusFilter.addEventListener("change", renderDonations);

const today = new Date();
const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
  .toISOString().split("T")[0];
pickupDate.min = localToday;

document.getElementById("menuToggle").addEventListener("click", function () {
  document.getElementById("mainNav").classList.toggle("open");
});

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", function () {
    document.querySelectorAll(".nav-link").forEach(navLink => navLink.classList.remove("active"));
    this.classList.add("active");
    document.getElementById("mainNav").classList.remove("open");
  });
});

renderDonations();
