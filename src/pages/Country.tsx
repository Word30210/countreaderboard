import { Show, createResource } from "solid-js"
import { A, useParams } from "@solidjs/router"

import { findCountryByCode, Country as CountryT } from "../data/countries"
import "./Country.scss"

const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "N/A"
    return value.toLocaleString()
}

const formatGdp = (value: number | null): string => {
    if (value === null || value === undefined) return "N/A"
    if (value >= 1_000_000_000_000) return "$" + (value / 1_000_000_000_000).toFixed(2) + "T"
    if (value >= 1_000_000_000) return "$" + (value / 1_000_000_000).toFixed(2) + "B"
    if (value >= 1_000_000) return "$" + (value / 1_000_000).toFixed(2) + "M"
    return "$" + value.toLocaleString()
}

const joinList = (list: string[] | undefined): string => {
    if (!list || list.length === 0) return "N/A"
    return list.join(", ")
}

const formatLanguages = (languages: CountryT["languages"]): string => {
    if (!languages) return "N/A"
    const values = Object.values(languages)
    return values.length > 0 ? values.join(", ") : "N/A"
}

const formatCurrencies = (currencies: CountryT["currencies"]): string => {
    if (!currencies) return "N/A"
    const parts = Object.entries(currencies).map(([code, info]) => {
        const symbol = info.symbol ? ` (${ info.symbol })` : ""
        return `${ info.name } [${ code }]${ symbol }`
    })
    return parts.length > 0 ? parts.join(", ") : "N/A"
}

const formatLatLng = (latlng: number[] | undefined): string => {
    if (!latlng || latlng.length < 2) return "N/A"
    return `${ latlng[0].toFixed(2) }, ${ latlng[1].toFixed(2) }`
}

const formatBool = (value: boolean | undefined): string => {
    if (value === true) return "Yes"
    if (value === false) return "No"
    return "N/A"
}

export default function Country() {
    const params = useParams<{ code: string }>()
    const [country] = createResource(() => params.code, findCountryByCode)

    return <div class="country-body">
        <div class="country-top-bar">
            <A href="/" class="paper-btn btn-secondary-outline">{ "<- Back to leaderboard" }</A>
        </div>

        <Show
            when={ !country.loading }
            fallback={ <div class="country-status">Loading country...</div> }
        >
            <Show
                when={ country() }
                fallback={ <div class="country-status">Country not found.</div> }
            >
                { (data) => {
                    const c = data()

                    return <div class="country-content">
                        <div class="country-header">
                            <img class="country-flag border border-3 border-primary" src={ c.flags.png } alt={ c.flags.alt ?? c.name.common } />
                            <div class="country-title">
                                <h1>{ c.name.common }</h1>
                                <h4 class="country-official">{ c.name.official }</h4>
                                <span class="country-code border border-2 border-primary">{ c.cca3 }</span>
                            </div>
                        </div>

                        <div class="country-info-grid">
                            <Info label="Capital" value={ joinList(c.capital) } />
                            <Info label="Region" value={ c.region || "N/A" } />
                            <Info label="Subregion" value={ c.subregion ?? "N/A" } />
                            <Info label="Population" value={ formatNumber(c.population) + (c.population ? " people" : "") } />
                            <Info label="Area" value={ c.area ? formatNumber(c.area) + " km²" : "N/A" } />
                            <Info label="GDP" value={ formatGdp(c.gdp) } />
                            <Info label="Languages" value={ formatLanguages(c.languages) } />
                            <Info label="Currencies" value={ formatCurrencies(c.currencies) } />
                            <Info label="Independent" value={ formatBool(c.independent) } />
                            <Info label="UN Member" value={ formatBool(c.unMember) } />
                            <Info label="Coordinates" value={ formatLatLng(c.latlng) } />
                            <Info label="Timezones" value={ formatTimezones(c.timezones) } />
                        </div>
                    </div>
                } }
            </Show>
        </Show>
    </div>
}

const Info = (props: { label: string, value: string }) => {
    return <div class="info-row border border-2 border-primary">
        <span class="info-label">{ props.label }</span>
        <span class="info-value">{ props.value }</span>
    </div>
}

const formatTimezones = (timezones: string[] | undefined): string => {
    if (!timezones || timezones.length === 0) return "N/A"
    if (timezones.length <= 3) return timezones.join(", ")
    return timezones.slice(0, 3).join(", ") + ` +${ timezones.length - 3 } more`
}
