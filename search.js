///////// SERVER.JS (backend) //////////////////

const CLIENT_ID = "XXXXXXXXXX";       
const CLIENT_SECRET = "XXXXXXXXXX";

let spotifyToken = null;
let tokenExpiresAt = 0;


// Get a Spotify access token
async function getSpotifyToken() {
  if (spotifyToken && Date.now() < tokenExpiresAt) {
    return spotifyToken;
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  const data = await response.json();
  spotifyToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return spotifyToken;
}

// Perform search
app.get("/search", async (req, res) => {
    const q = req.query.q;
    if (!q) return res.json([]);
  
    const token = await getSpotifyToken();
    // Spotify search API endpoint
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album,track&limit=5`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
  
    const data = await response.json();
  
    // Exctract info from results
    const albums = data.albums.items.slice(0, 5).map(album => ({
      id: album.id,
      type: "album",
      title: album.name,
      artist: album.artists.map(a => a.name).join(", "),
      image: album.images[0]?.url || null,
      year: album.release_date?.slice(0, 4) || null,
      popularity: album.popularity ?? 0,
      spotifyUrl: album.external_urls.spotify
    }));
  
    const tracks = data.tracks.items.slice(0, 5).map(track => ({
      id: track.id,
      type: "track",
      title: track.name,
      artist: track.artists.map(a => a.name).join(", "),
      image: track.album.images[0]?.url || null,
      year: track.album.release_date?.slice(0, 4) || null,
      popularity: track.popularity ?? 0,
      spotifyUrl: track.external_urls.spotify
    }));
  
    // Interleave albums & tracks (UX reasons, not important)
    const combined = [];
    const max = Math.max(albums.length, tracks.length);
  
    for (let i = 0; i < max; i++) {
      if (tracks[i]) combined.push(tracks[i]);
      if (albums[i]) combined.push(albums[i]);
    }
  
    res.json(combined.slice(0, 10));
  });

    // ============================
// Jukeboxd Search + Modal JS
// ============================

// Elements
const searchInput = document.getElementById("search");
const results = document.getElementById("results");

// ----------------------------
// Debounce Setup
// ----------------------------
let searchTimeout;

searchInput.addEventListener("input", () => {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    performSearch();
  }, 300); // 300ms pause after typing
});

// ----------------------------
// Search Function
// ----------------------------
async function performSearch() {
  const q = searchInput.value.trim();
  results.innerHTML = "";
  if (!q) return;

  try {
    const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
    const items = await res.json();
    renderResults(items);
  } catch (err) {
    console.error("Search error:", err);
  }
}



/////////////// SCRIPT.JS (frontend) ///////////////

// ----------------------------
// Render Search Results
// ----------------------------
function renderResults(items) {
  results.innerHTML = "";

  // Deduplicate and limit
  const seen = new Set();
  const uniqueItems = [];

  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      uniqueItems.push(item);
    }
    if (uniqueItems.length === 5) break;
  }

  uniqueItems.forEach(item => {
    const row = document.createElement("div");
    row.className = "search-result";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "0.75rem";
    row.style.cursor = "pointer";

    // Thumbnail
    const img = document.createElement("img");
    img.className = "search-thumb";
    img.src = item.image || "/placeholder.png";
    img.alt = item.title;

    // Text container
    const meta = document.createElement("div");
    meta.className = "search-meta";

    const title = document.createElement("div");
    title.className = "search-title";
    title.textContent = item.title;

    const sub = document.createElement("div");
    sub.className = "search-sub";
    sub.textContent = `${item.type.toUpperCase()} • ${item.artist}`;

    meta.appendChild(title);
    meta.appendChild(sub);

    row.appendChild(img);
    row.appendChild(meta);

    // Open modal on click
    row.onclick = () => openUniversalModal(item);

    results.appendChild(row);
  });
}