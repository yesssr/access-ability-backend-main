/*
Tujuan: Utilitas perhitungan durasi dan harga booking.
Caller: booking.service dan layer lain yang menghitung estimasi harga.
Dependensi: Tidak ada.
Main Functions: calculateDurationHours, calculateTotalPrice.
*/

const parseTimeToMinutes = (value) => {
  const [hours, minutes, seconds] = value.split(":").map(Number);
  return hours * 60 + minutes + (seconds || 0) / 60;
};

export function calculateDurationHours(startTime, endTime) {
  const startMinutes = parseTimeToMinutes(startTime);
  let endMinutes = parseTimeToMinutes(endTime);

  if (endMinutes === startMinutes) {
    return 0;
  }

  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  return Number(((endMinutes - startMinutes) / 60).toFixed(2));
}
export function calculateTotalPrice(durationHours, pricePerHour) {
  return Number((durationHours * Number(pricePerHour)).toFixed(2));
}
