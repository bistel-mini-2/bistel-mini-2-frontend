import { axios } from "./axiosConfig";

const FAVORITES_BASE_PATH = "/api/v1/favorites";
const MY_FAVORITES_PATH = "/api/v1/users/me/favorites";

const getFavoritePolicies = ({ page = 1, size = 100, signal } = {}) =>
  axios.get(MY_FAVORITES_PATH, {
    params: { page, size },
    signal,
    preserveResponse: true,
  });

const addFavoritePolicy = (policySlug) =>
  axios.post(`${FAVORITES_BASE_PATH}/${encodeURIComponent(policySlug)}`);

const removeFavoritePolicy = (policySlug) =>
  axios.delete(`${FAVORITES_BASE_PATH}/${encodeURIComponent(policySlug)}`);

const toggleFavoritePolicy = (policySlug, liked) =>
  liked ? removeFavoritePolicy(policySlug) : addFavoritePolicy(policySlug);

const favoriteApi = {
  getFavoritePolicies,
  addFavoritePolicy,
  removeFavoritePolicy,
  toggleFavoritePolicy,
  getFavorites: getFavoritePolicies,
  addFavorite: addFavoritePolicy,
  removeFavorite: removeFavoritePolicy,
};

export default favoriteApi;
