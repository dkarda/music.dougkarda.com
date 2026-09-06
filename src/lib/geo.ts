/** Rough center of Nassau County — Long Island + city + North Jersey from here. */
export const NY_METRO_CENTER = { lat: 40.726, lon: -73.634 };
export const NY_METRO_RADIUS_MILES = 60;

export function milesBetween(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isNyMetroCoords(lat: number, lon: number): boolean {
  return milesBetween(NY_METRO_CENTER.lat, NY_METRO_CENTER.lon, lat, lon) <= NY_METRO_RADIUS_MILES;
}
