export function resolveAchievementIcon(iconPath) {
  if (!iconPath || typeof iconPath !== 'string') {
    return '';
  }

  if (iconPath.startsWith('/src/assets/')) {
    return iconPath.replace('/src/assets/', '/achievement-icons/');
  }

  return iconPath;
}
