import { For, JSXElement, createResource } from "solid-js"
import "./Home.scss"

interface Country {
    name: {
        common: string;
        official: string;
    };
    
    region: string;
    
    population: number;
    area: number;
    
    flags: {
        png: string;
        alt: string;
    };
}

let items = {}

const fetchCountries = async (): Promise<Country[]> => {
    try {
        const response = await fetch("https://restcountries.com/v3.1/all?fields=name,flags,population")

        if (!response.ok) {
            throw new Error(`${ response.status }`)
        }

        const data: Country[] = await response.json()

        return data.sort((a, b) => b.population - a.population)
        // return data.sort((a, b) => b.area - a.area)
    } catch (error) {
        console.error(error)

        return []
    }
}

const CreateItem = (props: { text: string, png: string, value: number }): JSXElement => {
    return <>
        <div class="leaderboard-item-holder border border-2 border-primary">
            <span>#1</span>
            <img class="leaderboard-item-flag" src={ props.png } alt="" loading="lazy" />
            <span>{ props.text }</span>
            <span class="numeric-tnum" style="margin-left: auto">{ props.value.toLocaleString() }</span>
        </div>
    </>
}

export default function Home() {
    // fetchCountries()
    //     .then((result) => console.log(result))
    //     .catch((error) => console.error(error))

    const [countries] = createResource(fetchCountries)

    return <>
        <div class="body-div">
            <div class="main-title-container">
                <span>Countreaderboard</span>
            </div>

            <div class="leaderboard">
                <div class="leaderboard-navigation-bar">
                    <div class="search-country border border-2 border-primary">
                    </div>

                    <div class="search-filter border border-3 border-primary">
                    </div>

                    <div class="leaderboard-category border border-3 border-primary">
                    </div>
                </div>

                <div class="leaderboard-table">
                    <For each={ countries() }>
                        {
                            (country) => <div>
                                <CreateItem text={ country.name.common } png={ country.flags.png } value={ country.population }></CreateItem>
                            </div>
                        }
                    </For>
                </div>
            </div>
        </div>
    </>
}