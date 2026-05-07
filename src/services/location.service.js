/*
Tujuan: Menyediakan data referensi lokasi dari API eksternal untuk kebutuhan dropdown frontend.
Caller: controller lokasi.
Dependensi: API wilayah Indonesia (emsifa.github.io).
Main Functions: listProvinces, listRegenciesByProvince.
Side Effects: HTTP GET ke layanan eksternal; tanpa operasi read/write DB lokal.
*/

const BASE_URL = "https://emsifa.github.io/api-wilayah-indonesia/api";
const CACHE_TTL_MS = 10 * 60 * 1000;
const locationCache = new Map();

const makeError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const normalizeText = (value) => String(value || "").toLowerCase();

const fetchExternalJson = async (path) => {
  const cacheKey = path;
  const now = Date.now();
  const cached = locationCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const response = await fetch(`${BASE_URL}/${path}`);
  if (!response.ok) {
    throw makeError(502, `Failed to fetch location data: ${response.status}`);
  }

  const data = await response.json();
  locationCache.set(cacheKey, {
    data,
    expiresAt: now + CACHE_TTL_MS,
  });
  return data;
};

const parsePagination = (page, limit) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const perPage = Math.min(Math.max(Number(limit) || 100, 1), 500);
  return { currentPage, perPage };
};

export const listProvinces = async (query) => {
  const { currentPage, perPage } = parsePagination(query.page, query.limit);
  const searchTerm = normalizeText(query.search);

  const provinces = await fetchExternalJson("provinces.json");
  const filtered = provinces
    .filter((item) => {
      if (!searchTerm) return true;
      return normalizeText(item.name).includes(searchTerm);
    })
    .map((item) => ({
      id: String(item.id),
      name: item.name,
    }));

  const total = filtered.length;
  const offset = (currentPage - 1) * perPage;
  const items = filtered.slice(offset, offset + perPage);

  return {
    items,
    pagination: {
      page: currentPage,
      limit: perPage,
      total,
      total_pages: Math.max(Math.ceil(total / perPage), 1),
    },
  };
};

export const listRegenciesByProvince = async (provinceId, query) => {
  const { currentPage, perPage } = parsePagination(query.page, query.limit);
  const normalizedProvinceId = String(provinceId);
  const searchTerm = normalizeText(query.search);

  const regencies = await fetchExternalJson(
    `regencies/${normalizedProvinceId}.json`
  );
  if (!Array.isArray(regencies)) {
    throw makeError(502, "Invalid regency payload from external source");
  }

  const filtered = regencies
    .filter((item) => {
      if (!searchTerm) return true;
      return normalizeText(item.name).includes(searchTerm);
    })
    .map((item) => ({
      id: String(item.id),
      province_id: String(item.province_id),
      name: item.name,
    }));

  const total = filtered.length;
  const offset = (currentPage - 1) * perPage;
  const items = filtered.slice(offset, offset + perPage);

  return {
    items,
    pagination: {
      page: currentPage,
      limit: perPage,
      total,
      total_pages: Math.max(Math.ceil(total / perPage), 1),
    },
  };
};
