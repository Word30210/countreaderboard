export interface Country {
    name: {
        common: string
        official: string
    }

    cca3: string

    region?: string
    gini?: Record<string, number>

    population: number
    area: number
    gdp: number | null

    flags: {
        png: string
        svg?: string
        alt?: string
    }

    // Optional detail fields — only populated by findCountryByCode (single-country endpoint)
    subregion?: string
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

export const latestGini = (gini: Country["gini"]): number | null => {
    if (!gini) return null
    const entries = Object.entries(gini)
    if (entries.length === 0) return null
    entries.sort((a, b) => b[0].localeCompare(a[0]))
    return entries[0][1]
}

export const populationDensity = (country: Country): number | null => {
    if (!country.population || !country.area) return null
    return country.population / country.area
}

interface WorldBankIndicatorRow {
    countryiso3code: string
    value: number | null
    date: string
}

const LIST_FIELDS = ["name", "cca3", "population", "area", "flags", "region", "gini"].join(",")
const DETAIL_FIELDS = [
    "name",
    "cca3",
    "population",
    "area",
    "flags",
    "region",
    "subregion",
    "capital",
    "languages",
    "currencies",
    "timezones",
    "independent",
    "unMember",
    "latlng",
    "gini",
    "borders",
    "landlocked",
].join(",")

const GDP_INDICATOR = "NY.GDP.MKTP.CD"
const GDP_YEARS = "2018:2023"

let gdpCache: Map<string, number> | null = null
let gdpPending: Promise<Map<string, number>> | null = null

const fetchGdpMap = (): Promise<Map<string, number>> => {
    if (gdpCache) return Promise.resolve(gdpCache)
    if (gdpPending) return gdpPending

    gdpPending = (async () => {
        const result = new Map<string, number>()

        try {
            const url = `https://api.worldbank.org/v2/country/all/indicator/${ GDP_INDICATOR }?format=json&per_page=20000&date=${ GDP_YEARS }`
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
            console.error("Failed to load GDP from World Bank:", error)
        }

        gdpCache = result

        return result
    })()

    gdpPending.finally(() => { gdpPending = null })

    return gdpPending
}

let listCache: Country[] | null = null
let listPending: Promise<Country[]> | null = null

const fetchRestList = async (): Promise<Country[]> => {
    const response = await fetch(`https://restcountries.com/v3.1/all?fields=${ LIST_FIELDS }`)

    if (!response.ok) throw new Error(`restcountries ${ response.status }`)

    return await response.json()
}

export const fetchCountries = async (): Promise<Country[]> => {
    if (listCache) return listCache
    if (listPending) return listPending

    listPending = (async () => {
        try {
            const [base, gdpMap] = await Promise.all([
                fetchRestList(),
                fetchGdpMap(),
            ])

            const merged = base.map((country) => ({
                ...country,
                gdp: gdpMap.get(country.cca3) ?? null,
            }))

            listCache = merged

            return merged
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

    try {
        const [detailRes, gdpMap] = await Promise.all([
            fetch(`https://restcountries.com/v3.1/alpha/${ encodeURIComponent(target) }?fields=${ DETAIL_FIELDS }`),
            fetchGdpMap(),
        ])

        if (!detailRes.ok) {
            console.error(`restcountries alpha ${ detailRes.status } for ${ target }`)
            return undefined
        }

        const detail = await detailRes.json() as Country

        return {
            ...detail,
            gdp: gdpMap.get(detail.cca3) ?? null,
        }
    } catch (error) {
        console.error("Failed to load country detail:", error)

        return undefined
    }
}
