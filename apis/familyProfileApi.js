import { axios } from "./axiosConfig";

const FAMILY_PROFILE_ME_PATH = "/api/v1/family-profiles/me";

const normalizeFamilyProfileData = (data) =>
  data?.family_profile || data?.familyProfile || data?.profile || data;

const getMe = async () => {
  const data = await axios.get(FAMILY_PROFILE_ME_PATH);
  return normalizeFamilyProfileData(data);
};

const updateMe = async (payload) => {
  const data = await axios.put(FAMILY_PROFILE_ME_PATH, payload);
  return normalizeFamilyProfileData(data);
};

const familyProfileApi = {
  getMe,
  updateMe,
};

export default familyProfileApi;
