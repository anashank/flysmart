export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export const AIRPORTS: Airport[] = [
  // North America
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'US' },
  { code: 'LGA', name: 'LaGuardia Airport', city: 'New York', country: 'US' },
  { code: 'EWR', name: 'Newark Liberty International', city: 'Newark', country: 'US' },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'US' },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'US' },
  { code: 'ORD', name: "O'Hare International", city: 'Chicago', country: 'US' },
  { code: 'MDW', name: 'Midway International', city: 'Chicago', country: 'US' },
  { code: 'MIA', name: 'Miami International', city: 'Miami', country: 'US' },
  { code: 'BOS', name: 'Logan International', city: 'Boston', country: 'US' },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', country: 'US' },
  { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', country: 'US' },
  { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston', country: 'US' },
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta', country: 'US' },
  { code: 'DEN', name: 'Denver International', city: 'Denver', country: 'US' },
  { code: 'LAS', name: 'Harry Reid International', city: 'Las Vegas', country: 'US' },
  { code: 'PHX', name: 'Phoenix Sky Harbor International', city: 'Phoenix', country: 'US' },
  { code: 'MCO', name: 'Orlando International', city: 'Orlando', country: 'US' },
  { code: 'CLT', name: 'Charlotte Douglas International', city: 'Charlotte', country: 'US' },
  { code: 'IAD', name: 'Dulles International', city: 'Washington DC', country: 'US' },
  { code: 'DCA', name: 'Reagan National', city: 'Washington DC', country: 'US' },
  { code: 'MSP', name: 'Minneapolis-Saint Paul International', city: 'Minneapolis', country: 'US' },
  { code: 'DTW', name: 'Detroit Metropolitan Wayne County', city: 'Detroit', country: 'US' },
  { code: 'PHL', name: 'Philadelphia International', city: 'Philadelphia', country: 'US' },
  { code: 'SAN', name: 'San Diego International', city: 'San Diego', country: 'US' },
  { code: 'PDX', name: 'Portland International', city: 'Portland', country: 'US' },
  { code: 'HNL', name: 'Daniel K. Inouye International', city: 'Honolulu', country: 'US' },
  { code: 'AUS', name: 'Austin-Bergstrom International', city: 'Austin', country: 'US' },
  { code: 'SLC', name: 'Salt Lake City International', city: 'Salt Lake City', country: 'US' },
  { code: 'BNA', name: 'Nashville International', city: 'Nashville', country: 'US' },
  { code: 'RDU', name: 'Raleigh-Durham International', city: 'Raleigh', country: 'US' },
  { code: 'YYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'CA' },
  { code: 'YVR', name: 'Vancouver International', city: 'Vancouver', country: 'CA' },
  { code: 'YUL', name: 'Montréal-Trudeau International', city: 'Montreal', country: 'CA' },
  { code: 'YYC', name: 'Calgary International', city: 'Calgary', country: 'CA' },
  { code: 'MEX', name: 'Benito Juárez International', city: 'Mexico City', country: 'MX' },
  { code: 'CUN', name: 'Cancún International', city: 'Cancún', country: 'MX' },
  // Europe
  { code: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'GB' },
  { code: 'LGW', name: 'Gatwick Airport', city: 'London', country: 'GB' },
  { code: 'LCY', name: 'London City Airport', city: 'London', country: 'GB' },
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'FR' },
  { code: 'ORY', name: 'Orly Airport', city: 'Paris', country: 'FR' },
  { code: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'NL' },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'DE' },
  { code: 'MUC', name: 'Munich Airport', city: 'Munich', country: 'DE' },
  { code: 'BER', name: 'Berlin Brandenburg Airport', city: 'Berlin', country: 'DE' },
  { code: 'MAD', name: 'Adolfo Suárez Madrid-Barajas', city: 'Madrid', country: 'ES' },
  { code: 'BCN', name: 'Barcelona-El Prat Airport', city: 'Barcelona', country: 'ES' },
  { code: 'FCO', name: 'Fiumicino Airport', city: 'Rome', country: 'IT' },
  { code: 'MXP', name: 'Malpensa Airport', city: 'Milan', country: 'IT' },
  { code: 'ZRH', name: 'Zurich Airport', city: 'Zurich', country: 'CH' },
  { code: 'GVA', name: 'Geneva Airport', city: 'Geneva', country: 'CH' },
  { code: 'VIE', name: 'Vienna International Airport', city: 'Vienna', country: 'AT' },
  { code: 'BRU', name: 'Brussels Airport', city: 'Brussels', country: 'BE' },
  { code: 'CPH', name: 'Copenhagen Airport', city: 'Copenhagen', country: 'DK' },
  { code: 'ARN', name: 'Stockholm Arlanda Airport', city: 'Stockholm', country: 'SE' },
  { code: 'OSL', name: 'Oslo Gardermoen Airport', city: 'Oslo', country: 'NO' },
  { code: 'HEL', name: 'Helsinki-Vantaa Airport', city: 'Helsinki', country: 'FI' },
  { code: 'DUB', name: 'Dublin Airport', city: 'Dublin', country: 'IE' },
  { code: 'LIS', name: 'Humberto Delgado Airport', city: 'Lisbon', country: 'PT' },
  { code: 'ATH', name: 'Athens International', city: 'Athens', country: 'GR' },
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'TR' },
  { code: 'WAW', name: 'Warsaw Chopin Airport', city: 'Warsaw', country: 'PL' },
  // Asia-Pacific
  { code: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'JP' },
  { code: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'JP' },
  { code: 'KIX', name: 'Kansai International Airport', city: 'Osaka', country: 'JP' },
  { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', country: 'KR' },
  { code: 'PEK', name: 'Beijing Capital International', city: 'Beijing', country: 'CN' },
  { code: 'PKX', name: 'Beijing Daxing International', city: 'Beijing', country: 'CN' },
  { code: 'PVG', name: 'Shanghai Pudong International', city: 'Shanghai', country: 'CN' },
  { code: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'HK' },
  { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', country: 'SG' },
  { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'TH' },
  { code: 'KUL', name: 'Kuala Lumpur International', city: 'Kuala Lumpur', country: 'MY' },
  { code: 'CGK', name: 'Soekarno-Hatta International', city: 'Jakarta', country: 'ID' },
  { code: 'MNL', name: 'Ninoy Aquino International', city: 'Manila', country: 'PH' },
  { code: 'SYD', name: 'Sydney Kingsford Smith Airport', city: 'Sydney', country: 'AU' },
  { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', country: 'AU' },
  { code: 'BNE', name: 'Brisbane Airport', city: 'Brisbane', country: 'AU' },
  { code: 'PER', name: 'Perth Airport', city: 'Perth', country: 'AU' },
  { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', country: 'NZ' },
  { code: 'DEL', name: 'Indira Gandhi International', city: 'New Delhi', country: 'IN' },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International', city: 'Mumbai', country: 'IN' },
  { code: 'BLR', name: 'Kempegowda International', city: 'Bangalore', country: 'IN' },
  // Middle East & Africa
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'AE' },
  { code: 'AUH', name: 'Abu Dhabi International Airport', city: 'Abu Dhabi', country: 'AE' },
  { code: 'DOH', name: 'Hamad International Airport', city: 'Doha', country: 'QA' },
  { code: 'RUH', name: 'King Khalid International', city: 'Riyadh', country: 'SA' },
  { code: 'JED', name: 'King Abdulaziz International', city: 'Jeddah', country: 'SA' },
  { code: 'TLV', name: 'Ben Gurion Airport', city: 'Tel Aviv', country: 'IL' },
  { code: 'CAI', name: 'Cairo International Airport', city: 'Cairo', country: 'EG' },
  { code: 'JNB', name: 'O.R. Tambo International', city: 'Johannesburg', country: 'ZA' },
  { code: 'CPT', name: 'Cape Town International', city: 'Cape Town', country: 'ZA' },
  { code: 'NBO', name: 'Jomo Kenyatta International', city: 'Nairobi', country: 'KE' },
  { code: 'ADD', name: 'Addis Ababa Bole International', city: 'Addis Ababa', country: 'ET' },
  // Latin America
  { code: 'GRU', name: 'São Paulo-Guarulhos International', city: 'São Paulo', country: 'BR' },
  { code: 'GIG', name: 'Rio de Janeiro-Galeão International', city: 'Rio de Janeiro', country: 'BR' },
  { code: 'EZE', name: 'Ministro Pistarini International', city: 'Buenos Aires', country: 'AR' },
  { code: 'SCL', name: 'Arturo Merino Benítez International', city: 'Santiago', country: 'CL' },
  { code: 'BOG', name: 'El Dorado International', city: 'Bogotá', country: 'CO' },
  { code: 'LIM', name: 'Jorge Chávez International', city: 'Lima', country: 'PE' },
];

export function searchAirports(query: string): Airport[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];

  return AIRPORTS.filter(
    (a) =>
      a.code.toLowerCase().startsWith(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.country.toLowerCase().startsWith(q)
  ).slice(0, 6);
}
