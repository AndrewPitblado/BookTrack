const AVATAR_PRESET_IDS = [
  "placeholder-otter",
  "placeholder-fox",
  "placeholder-owl",
  "placeholder-koala",
  "placeholder-panda",
  "placeholder-whale",
];

function isValidAvatarPresetId(value) {
  return AVATAR_PRESET_IDS.includes(value);
}

module.exports = {
  AVATAR_PRESET_IDS,
  isValidAvatarPresetId,
};