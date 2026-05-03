/**
 * Build GeoJSON Point from multipart or JSON body fields (lat/lng).
 * MongoDB expects coordinates as [longitude, latitude].
 */
function parseCoordinates(body) {
  if (!body || typeof body !== "object") return null;
  const latRaw = body.latitude ?? body.lat;
  const lngRaw = body.longitude ?? body.lng;
  if (latRaw === "" || latRaw === undefined || lngRaw === "" || lngRaw === undefined) return null;
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { type: "Point", coordinates: [lng, lat] };
}

module.exports = { parseCoordinates };
