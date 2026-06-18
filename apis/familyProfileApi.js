import { axios } from "./axiosConfig";

const FAMILY_PROFILE_ME_PATH = "/api/v1/family-profiles/me";

const normalizeFamilyProfileData = (data) => {
  if (data && typeof data === "object") {
    if (Object.prototype.hasOwnProperty.call(data, "family_profile")) {
      return data.family_profile;
    }

    if (Object.prototype.hasOwnProperty.call(data, "familyProfile")) {
      return data.familyProfile;
    }

    if (Object.prototype.hasOwnProperty.call(data, "profile")) {
      return data.profile;
    }
  }

  return data;
};

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
