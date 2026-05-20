import { For, JSXElement, Show, createMemo, createResource, createSignal } from "solid-js"
import { useNavigate } from "@solidjs/router"

import { Country, fetchCountries, latestGini, populationDensity } from "../data/countries"
import Dropdown, { DropdownOption } from "../components/Dropdown"
import "./Home.scss"

type Category = "population" | "gdp" | "area" | "density" | "gini"

interface CategoryDef {
    key: Category
    label: string
    sortDir: "desc" | "asc"
    suffix?: string
}

const CATEGORIES: CategoryDef[] = [
    { key: "population", label: "Population", sortDir: "desc", suffix: " people" },
    { key: "gdp", label: "GDP (USD)", sortDir: "desc" },
    { key: "area", label: "Area (km²)", sortDir: "desc", suffix: " km²" },
    { key: "density", label: "Population Density", sortDir: "desc", suffix: " /km²" },
    { key: "gini", label: "Gini Index", sortDir: "asc" },
]

const REGION_ALL = "All" as const
const REGIONS = ["Africa", "Americas", "Asia", "Europe", "Oceania", "Antarctic"] as const
type Region = typeof REGION_ALL | typeof REGIONS[number]

const regionOptions: DropdownOption<Region>[] = [
    { value: REGION_ALL, label: "All continents" },
    ...REGIONS.map((r) => ({ value: r, label: r })),
]

const categoryOptions: DropdownOption<Category>[] = CATEGORIES.map((c) => ({
    value: c.key,
    label: c.label,
}))

const getCategoryValue = (country: Country, category: Category): number | null => {
    if (category === "population") return country.population || null
    if (category === "area") return country.area || null
    if (category === "gdp") return country.gdp
    if (category === "density") return populationDensity(country)
    if (category === "gini") return latestGini(country.gini)
    return null
}

const formatGdp = (value: number): string => {
    if (value >= 1_000_000_000_000) return "$" + (value / 1_000_000_000_000).toFixed(2) + "T"
    if (value >= 1_000_000_000) return "$" + (value / 1_000_000_000).toFixed(2) + "B"
    if (value >= 1_000_000) return "$" + (value / 1_000_000).toFixed(2) + "M"
    return "$" + value.toLocaleString()
}

const formatValue = (value: number | null, category: Category): string => {
    if (value === null || value === undefined) return "N/A"

    if (category === "gdp") return formatGdp(value)
    if (category === "density") return value.toFixed(1) + " /km²"
    if (category === "gini") return value.toFixed(1)

    const def = CATEGORIES.find((c) => c.key === category)!
    return value.toLocaleString() + (def.suffix ?? "")
}

interface LeaderboardItemProps {
    rank: number
    country: Country
    category: Category
}

const LeaderboardItem = (props: LeaderboardItemProps): JSXElement => {
    const navigate = useNavigate()

    return <div
        class="leaderboard-item-holder border border-2 border-primary"
        onClick={ () => navigate(`/country/${ props.country.cca3 }`) }
    >
        <span class="leaderboard-item-rank">#{ props.rank }</span>
        <img class="leaderboard-item-flag" src={ props.country.flags.png } alt={ props.country.flags.alt ?? props.country.name.common } loading="lazy" />
        <span class="leaderboard-item-name">{ props.country.name.common }</span>
        <span class="leaderboard-item-value numeric-tnum">{ formatValue(getCategoryValue(props.country, props.category), props.category) }</span>
    </div>
}

export default function Home() {
    const [countries] = createResource(fetchCountries)
    const [category, setCategory] = createSignal<Category>("population")
    const [region, setRegion] = createSignal<Region>(REGION_ALL)
    const [query, setQuery] = createSignal("")

    const filtered = createMemo(() => {
        const list = countries() ?? []
        const r = region()

        if (r === REGION_ALL) return list

        return list.filter((c) => c.region === r)
    })

    const ranked = createMemo(() => {
        const list = filtered()
        const cat = category()
        const def = CATEGORIES.find((c) => c.key === cat)!
        const dir = def.sortDir === "asc" ? 1 : -1

        const sorted = [...list].sort((a, b) => {
            const av = getCategoryValue(a, cat)
            const bv = getCategoryValue(b, cat)

            if (av === null && bv === null) return 0
            if (av === null) return 1
            if (bv === null) return -1

            return (av - bv) * dir
        })

        return sorted.map((country, index) => ({ country, rank: index + 1 }))
    })

    const visible = createMemo(() => {
        const q = query().trim().toLowerCase()

        if (!q) return ranked()

        return ranked().filter(({ country }) =>
            country.name.common.toLowerCase().includes(q) ||
            country.name.official.toLowerCase().includes(q) ||
            country.cca3.toLowerCase().includes(q)
        )
    })

    return <>
        <div class="body-div">
            <div class="main-title-container">
                <span>Countreaderboard</span>
            </div>

            <div class="leaderboard">
                <div class="leaderboard-navigation-bar">
                    <div class="search-country">
                        <input
                            type="text"
                            class="search-input"
                            placeholder="Search a country..."
                            value={ query() }
                            onInput={ (e) => setQuery(e.currentTarget.value) }
                        />
                    </div>

                    <Dropdown<Region>
                        label="Filter"
                        value={ region() }
                        options={ regionOptions }
                        onChange={ setRegion }
                    />

                    <Dropdown<Category>
                        label="Category"
                        value={ category() }
                        options={ categoryOptions }
                        onChange={ setCategory }
                    />
                </div>

                <div class="leaderboard-table">
                    <Show when={ !countries.loading } fallback={ <div class="leaderboard-status">Loading countries...</div> }>
                        <Show when={ visible().length > 0 } fallback={ <div class="leaderboard-status">No countries match.</div> }>
                            <For each={ visible() }>
                                { (entry) => <LeaderboardItem rank={ entry.rank } country={ entry.country } category={ category() } /> }
                            </For>
                        </Show>
                    </Show>
                </div>
            </div>
        </div>
    </>
}
