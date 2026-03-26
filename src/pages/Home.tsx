import "./Home.scss"

export default function Home() {
    return <>
        <div class="body-div">
            <div class="main-title-container">
                <span>Countreaderboard</span>
            </div>

            <div class="leaderboard">
                <div class="leaderboard-navigation-bar">
                    <div class="search-country col border border-2 border-primary">
                    </div>

                    <div class="search-filter col border border-3 border-primary">
                    </div>

                    <div class="leaderboard-category col border border-3 border-primary">
                    </div>
                </div>
            </div>
        </div>
    </>
}