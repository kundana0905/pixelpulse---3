const form = document.querySelector("#search-form");
const input = document.querySelector("#search-input");
const statusMessage = document.querySelector("#status");
const resultsGrid = document.querySelector("#results");
const resultsTitle = document.querySelector("#results-title");
const resultsCount = document.querySelector("#results-count");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  searchImages(input.value.trim());
});

async function searchImages(query) {
  if (!query) {
    setStatus("Enter a word or phrase to start searching.", "empty");
    input.focus();
    return;
  }

  resultsTitle.textContent = `Results for “${query}”`;
  resultsCount.textContent = "";
  resultsGrid.replaceChildren();
  resultsGrid.setAttribute("aria-busy", "true");
  setStatus("Searching Wikimedia Commons…", "loading");
  showSkeletons();

  const params = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: "6",
    gsrlimit: "12",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "640",
    format: "json",
    origin: "*",
  });

  try {
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
    if (!response.ok) {
      throw new Error(`Image search failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.info || "Wikimedia Commons returned an error.");
    }

    const pages = Object.values(data.query?.pages ?? {});
    const images = pages.filter((page) => page.imageinfo?.[0]?.thumburl);

    resultsGrid.replaceChildren();
    resultsGrid.setAttribute("aria-busy", "false");

    if (images.length === 0) {
      resultsCount.textContent = "";
      setStatus(`No images found for “${query}”. Try another search.`, "empty");
      return;
    }

    resultsCount.textContent = `${images.length} ${images.length === 1 ? "image" : "images"}`;
    setStatus(`Showing ${images.length} ${images.length === 1 ? "image" : "images"} for “${query}”.`, "results");
    renderImages(images);
  } catch (error) {
    console.error("Unable to search Wikimedia Commons:", error);
    resultsGrid.replaceChildren();
    resultsGrid.setAttribute("aria-busy", "false");
    resultsCount.textContent = "";
    setStatus("Something went wrong while searching. Check your connection and try again.", "error");
  }
}

function showSkeletons() {
  const placeholders = Array.from({ length: 6 }, () => {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton";
    skeleton.setAttribute("aria-hidden", "true");
    return skeleton;
  });
  resultsGrid.replaceChildren(...placeholders);
}

function renderImages(images) {
  const cards = images.map((page, index) => {
    const imageInfo = page.imageinfo[0];
    const card = document.createElement("article");
    const link = document.createElement("a");
    const image = document.createElement("img");
    const title = document.createElement("h3");

    card.className = "result-card";
    card.style.animationDelay = `${Math.min(index * 45, 360)}ms`;
    link.href = imageInfo.descriptionurl || imageInfo.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    image.src = imageInfo.thumburl;
    image.alt = page.title.replace(/^File:/, "").replaceAll("_", " ");
    image.loading = "lazy";
    title.textContent = page.title.replace(/^File:/, "").replaceAll("_", " ");

    link.append(image, title);
    card.append(link);
    return card;
  });

  resultsGrid.replaceChildren(...cards);
}

function setStatus(message, state) {
  statusMessage.textContent = message;
  statusMessage.dataset.state = state;
}