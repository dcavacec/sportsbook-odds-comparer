import { Odds } from "./api";

function getWeekNumber(date: Date, startDate: Date): number {
    const diff = date.getTime() - startDate.getTime();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const weekNumber = Math.floor(diff / oneWeek) + 1;
    return Math.max(1, weekNumber); // Ensure the minimum week number is 1
}

function getWeekStartDate(
    date: Date = new Date(),
    weekStartDay: number = 0
): Date {
    const day = date.getDay();
    const diff =
        date.getDate() -
        day +
        (day < weekStartDay ? weekStartDay - 7 : weekStartDay);
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() + diff);
    startDate.setHours(0, 0, 0, 0);
    return startDate;
}

function getWeekEndDate(startDate: Date): Date {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    return endDate;
}

// TODO: generalize to other markets
function getAverageOdds(row: Odds, isHome: boolean): number {
    const teamName = isHome ? row.home_team : row.away_team;
    const odds = row.bookmakers.flatMap((bookmaker) =>
        bookmaker.markets
            .filter((market) => market.key === "h2h") // Ensure we're only looking at moneyline markets
            .map((market) => {
                const outcome = market.outcomes.find(
                    (o) => o.name === teamName
                );
                return outcome ? outcome.price : null;
            })
            .filter((price): price is number => price !== null)
    );

    if (odds.length === 0) return 0;
    return Math.round(odds.reduce((a, b) => a + b, 0) / odds.length);
}

function getMaxOdds(row: Odds, isHome: boolean): string {
    const teamName = isHome ? row.home_team : row.away_team;
    const maxOdds = row.bookmakers.reduce((max, bookmaker) => {
        const bookmakerMax = bookmaker.markets
            .filter((market) => market.key === "h2h")
            .reduce((marketMax, market) => {
                const outcome = market.outcomes.find(
                    (o) => o.name === teamName
                );
                return outcome ? Math.max(marketMax, outcome.price) : marketMax;
            }, -Infinity);
        return Math.max(max, bookmakerMax);
    }, -Infinity);
    return maxOdds === -Infinity ? "N/A" : Math.round(maxOdds).toString();
}

function getMinOdds(row: Odds, isHome: boolean): string {
    const teamName = isHome ? row.home_team : row.away_team;
    const minOdds = row.bookmakers.reduce((min, bookmaker) => {
        const bookmakerMin = bookmaker.markets
            .filter((market) => market.key === "h2h")
            .reduce((marketMin, market) => {
                const outcome = market.outcomes.find(
                    (o) => o.name === teamName
                );
                return outcome ? Math.min(marketMin, outcome.price) : marketMin;
            }, Infinity);
        return Math.min(min, bookmakerMin);
    }, Infinity);
    return minOdds === Infinity ? "N/A" : Math.round(minOdds).toString();
}

function getWeekStartDay(sport_title: string): number {
    switch (sport_title) {
        case "NFL":
            return 2; // Tuesday
        default:
            return 0;
    }
}

function getNflStartDate() {
    const firstGameDate = new Date('2024-09-05T00:44:49Z');
    return getWeekStartDate(firstGameDate);
}

function getNflEndDate() {
    return new Date('2025-02-28T00:00:00Z')
}

export {
    getWeekStartDate,
    getWeekEndDate,
    getAverageOdds,
    getMaxOdds,
    getMinOdds,
    getWeekNumber,
    getWeekStartDay,
    getNflStartDate,
    getNflEndDate,
};
