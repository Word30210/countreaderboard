export interface Country {
    name: {
        common: string
        official: string
    }

    cca2: string
    cca3: string

    region: string
    subregion?: string

    population: number
    area: number
    gdp: number | null
    gini: number | null

    flags: {
        png: string
        svg: string
        alt?: string
    }

    capital?: string[]
    languages?: Record<string, string>
    currencies?: Record<string, { name: string, symbol?: string }>
    timezones?: string[]
    independent?: boolean
    unMember?: boolean
    latlng?: number[]
    borders?: string[]
    landlocked?: boolean
}

export const populationDensity = (country: Country): number | null => {
    if (!country.population || !country.area) return null
    return country.population / country.area
}

interface MledozeCountry {
    name: { common: string, official: string }
    cca2: string
    cca3: string
    region?: string
    subregion?: string
    capital?: string[]
    languages?: Record<string, string>
    currencies?: Record<string, { name: string, symbol?: string }>
    area?: number
    latlng?: number[]
    landlocked?: boolean
    borders?: string[]
    independent?: boolean
    unMember?: boolean
}

interface Dr5hnCountry {
    iso3: string
    population?: number
    timezones?: { zoneName: string }[]
}

interface WorldBankIndicatorRow {
    countryiso3code: string
    value: number | null
    date: string
}

const MLEDOZE_URL = "https://cdn.jsdelivr.net/gh/mledoze/countries@master/countries.json"
const DR5HN_URL = "https://cdn.jsdelivr.net/gh/dr5hn/countries-states-cities-database@master/json/countries.json"

const GDP_INDICATOR = "NY.GDP.MKTP.CD"
const GINI_INDICATOR = "SI.POV.GINI"
const WB_YEARS = "2018:2024"

const flagUrls = (cca2: string): { png: string, svg: string } => {
    const code = cca2.toLowerCase()
    return {
        png: `https://flagcdn.com/w320/${ code }.png`,
        svg: `https://flagcdn.com/${ code }.svg`,
    }
}

const fetchWorldBankLatest = async (indicator: string): Promise<Map<string, number>> => {
    const result = new Map<string, number>()

    try {
        const url = `https://api.worldbank.org/v2/country/all/indicator/${ indicator }?format=json&per_page=20000&date=${ WB_YEARS }`
        const response = await fetch(url)

        if (!response.ok) throw new Error(`World Bank API ${ response.status }`)

        const data = await response.json()
        const rows: WorldBankIndicatorRow[] = Array.isArray(data) && data.length > 1 ? data[1] : []

        const latest = new Map<string, { value: number, date: string }>()

        for (const row of rows) {
            if (row.value === null || row.value === undefined) continue

            const code = row.countryiso3code

            if (!code) continue

            const prev = latest.get(code)

            if (!prev || row.date > prev.date) {
                latest.set(code, { value: row.value, date: row.date })
            }
        }

        for (const [code, entry] of latest) {
            result.set(code, entry.value)
        }
    } catch (error) {
        console.error(`Failed to load World Bank indicator ${ indicator }:`, error)
    }

    return result
}

const buildList = async (): Promise<Country[]> => {
    const [mledozeRes, dr5hnRes, gdpMap, giniMap] = await Promise.all([
        fetch(MLEDOZE_URL),
        fetch(DR5HN_URL),
        fetchWorldBankLatest(GDP_INDICATOR),
        fetchWorldBankLatest(GINI_INDICATOR),
    ])

    if (!mledozeRes.ok) throw new Error(`mledoze ${ mledozeRes.status }`)
    if (!dr5hnRes.ok) throw new Error(`dr5hn ${ dr5hnRes.status }`)

    const mledoze: MledozeCountry[] = await mledozeRes.json()
    const dr5hn: Dr5hnCountry[] = await dr5hnRes.json()

    const dr5hnMap = new Map<string, Dr5hnCountry>()

    for (const entry of dr5hn) {
        if (entry.iso3) dr5hnMap.set(entry.iso3, entry)
    }

    return mledoze.map((m): Country => {
        const supplementary = dr5hnMap.get(m.cca3)
        const cca2 = m.cca2 || ""
        const flags = cca2 ? flagUrls(cca2) : { png: "", svg: "" }

        return {
            name: m.name,
            cca2,
            cca3: m.cca3,
            region: m.region ?? "",
            subregion: m.subregion,
            capital: m.capital,
            languages: m.languages,
            currencies: m.currencies,
            area: m.area ?? 0,
            population: supplementary?.population ?? 0,
            gdp: gdpMap.get(m.cca3) ?? null,
            gini: giniMap.get(m.cca3) ?? null,
            timezones: supplementary?.timezones?.map((t) => t.zoneName),
            latlng: m.latlng,
            landlocked: m.landlocked,
            borders: m.borders,
            independent: m.independent,
            unMember: m.unMember,
            flags,
        }
    })
}

let listCache: Country[] | null = null
let listPending: Promise<Country[]> | null = null

export const fetchCountries = async (): Promise<Country[]> => {
    if (listCache) return listCache
    if (listPending) return listPending

    listPending = (async () => {
        try {
            const list = await buildList()
            listCache = list

            return list
        } catch (error) {
            console.error(error)

            return []
        }
    })()

    listPending.finally(() => { listPending = null })

    return listPending
}

export const findCountryByCode = async (code: string): Promise<Country | undefined> => {
    const target = code.toUpperCase()
    const list = await fetchCountries()

    return list.find((c) => c.cca3 === target)
}
