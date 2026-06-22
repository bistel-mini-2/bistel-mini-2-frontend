import { axios } from "./axiosConfig";

const FAVORITES_BASE_PATH = "/api/v1/favorites";
const MY_FAVORITES_PATH = "/api/v1/users/me/favorites";

const getFavorites = ({ page = 1, size = 100, signal } = {}) =>
  axios.get(MY_FAVORITES_PATH, {
    params: { page, size },
    signal,
    preserveResponse: true,
  });

const addFavorite = (policySlug) =>
  axios.post(`${FAVORITES_BASE_PATH}/${encodeURIComponent(policySlug)}`);

const removeFavorite = (policySlug) =>
  axios.delete(`${FAVORITES_BASE_PATH}/${encodeURIComponent(policySlug)}`);

const favoriteApi = {
  getFavorites,
  addFavorite,
  removeFavorite,
};

export default favoriteApi;
