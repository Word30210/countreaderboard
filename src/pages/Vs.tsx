import { createMemo, createResource, For, JSXElement, Show } from "solid-js"
import { A, useNavigate, useParams } from "@solidjs/router"

import { Country, fetchCountries, populationDensity } from "../data/countries"
import Dropdown, { DropdownOption } from "../components/Dropdown"
import "./Vs.scss"

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

const getCategoryValue = (country: Country, category: Category): number | null => {
    if (category === "population") return country.population || null
    if (category === "area") return country.area || null
    if (category === "gdp") return country.gdp
    if (category === "density") return populationDensity(country)
    if (category === "gini") return country.gini
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

const buildRanks = (list: Country[], category: Category): { ranks: Map<string, number>, total: number } => {
    const def = CATEGORIES.find((c) => c.key === category)!
    const dir = def.sortDir === "asc" ? 1 : -1

    const entries = list.map((c) => ({ cca3: c.cca3, value: getCategoryValue(c, category) }))

    entries.sort((a, b) => {
        if (a.value === null && b.value === null) return 0
        if (a.value === null) return 1
        if (b.value === null) return -1

        return (a.value - b.value) * dir
    })

    const ranks = new Map<string, number>()
    let position = 0

    for (const e of entries) {
        if (e.value === null) continue
        position++
        ranks.set(e.cca3, position)
    }

    return { ranks, total: position }
}

const buildVsPath = (left: string | undefined, right: string | undefined): string => {
    if (left && right) return `/vs/${ left }/${ right }`
    if (left) return `/vs/${ left }`
    if (right) return `/vs/${ right }`
    return "/vs"
}

export default function Vs(): JSXElement {
    const params = useParams<{ left?: string, right?: string }>()
    const navigate = useNavigate()
    const [countries] = createResource(fetchCountries)

    const sortedOptions = createMemo<DropdownOption[]>(() => {
        const list = countries() ?? []

        return [...list]
            .sort((a, b) => a.name.common.localeCompare(b.name.common))
            .map((c) => ({ value: c.cca3, label: c.name.common, icon: c.flags.png }))
    })

    const findByCode = (code: string | undefined): Country | undefined => {
        if (!code) return undefined
        const target = code.toUpperCase()

        return (countries() ?? []).find((c) => c.cca3 === target)
    }

    const left = createMemo(() => findByCode(params.left))
    const right = createMemo(() => findByCode(params.right))

    const setLeft = (code: string) => navigate(buildVsPath(code, params.right), { replace: true })
    const setRight = (code: string) => navigate(buildVsPath(params.left, code), { replace: true })

    const ranksByCategory = createMemo(() => {
        const list = countries() ?? []
        const out = {} as Record<Category, { ranks: Map<string, number>, total: number }>

        for (const def of CATEGORIES) out[def.key] = buildRanks(list, def.key)

        return out
    })

    return <div class="vs-body">
        <div class="vs-top-bar">
            <A href="/" class="paper-btn btn-secondary-outline">{ "<- Back to leaderboard" }</A>
        </div>

        <div class="vs-title-container">
            <span>Country VS Country</span>
        </div>

        <Show
            when={ !countries.loading }
            fallback={ <div class="vs-status">Loading countries...</div> }
        >
            <div class="vs-pickers">
                <PickerSide
                    side="left"
                    country={ left() }
                    options={ sortedOptions() }
                    onChange={ setLeft }
                />

                <div class="vs-versus-label">VS</div>

                <PickerSide
                    side="right"
                    country={ right() }
                    options={ sortedOptions() }
                    onChange={ setRight }
                />
            </div>

            <Show
                when={ left() && right() }
                fallback={
                    <div class="vs-status">
                        { left() ? "Pick a country on the right to compare." : "Pick two countries to compare." }
                    </div>
                }
            >
                <div class="vs-grid">
                    <For each={ CATEGORIES }>
                        { (def) => <ComparisonRow
                            def={ def }
                            left={ left()! }
                            right={ right()! }
                            ranks={ ranksByCategory()[def.key] }
                        /> }
                    </For>
                </div>
            </Show>
        </Show>
    </div>
}

interface PickerSideProps {
    side: "left" | "right"
    country: Country | undefined
    options: DropdownOption[]
    onChange: (code: string) => void
}

const PickerSide = (props: PickerSideProps): JSXElement => {
    return <div class="vs-picker">
        <Dropdown
            label={ props.side === "left" ? "Left" : "Right" }
            placeholder={ props.side === "left" ? "Pick a country..." : "Pick a country..." }
            value={ props.country?.cca3 ?? "" }
            options={ props.options }
            onChange={ props.onChange }
        />

        <Show
            when={ props.country }
            fallback={ <div class="vs-country-placeholder border border-2 border-primary">No country selected</div> }
        >
            { (c) => <div class="vs-country-card">
                <img
                    class="vs-country-flag border border-3 border-primary"
                    src={ c().flags.png }
                    alt={ c().flags.alt ?? c().name.common }
                />
                <div class="vs-country-meta">
                    <div class="vs-country-name">{ c().name.common }</div>
                    <div class="vs-country-code border border-2 border-primary">{ c().cca3 }</div>
                </div>
            </div> }
        </Show>
    </div>
}

interface ComparisonRowProps {
    def: CategoryDef
    left: Country
    right: Country
    ranks: { ranks: Map<string, number>, total: number }
}

const ComparisonRow = (props: ComparisonRowProps): JSXElement => {
    const leftValue = () => getCategoryValue(props.left, props.def.key)
    const rightValue = () => getCategoryValue(props.right, props.def.key)
    const leftRank = () => props.ranks.ranks.get(props.left.cca3)
    const rightRank = () => props.ranks.ranks.get(props.right.cca3)

    const winner = (): "left" | "right" | null => {
        const lv = leftValue()
        const rv = rightValue()
        const dir = props.def.sortDir === "asc" ? 1 : -1

        if (lv === null && rv === null) return null
        if (lv === null) return "right"
        if (rv === null) return "left"
        if (lv === rv) return null

        return (lv - rv) * dir > 0 ? "right" : "left"
    }

    const rankText = (rank: number | undefined): string =>
        rank ? `#${ rank } of ${ props.ranks.total }` : "unranked"

    return <div class="vs-row border border-2 border-primary">
        <div class="vs-row-label">{ props.def.label }</div>
        <div class="vs-row-cells">
            <div class={ `vs-cell ${ winner() === "left" ? "is-winner" : "" }` }>
                <span class="vs-cell-value numeric-tnum">{ formatValue(leftValue(), props.def.key) }</span>
                <span class="vs-cell-rank">{ rankText(leftRank()) }</span>
            </div>
            <div class={ `vs-cell ${ winner() === "right" ? "is-winner" : "" }` }>
                <span class="vs-cell-value numeric-tnum">{ formatValue(rightValue(), props.def.key) }</span>
                <span class="vs-cell-rank">{ rankText(rightRank()) }</span>
            </div>
        </div>
    </div>
}
