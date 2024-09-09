"use client"
import { useState, useMemo } from 'react';
import { getNflStartDate } from "../../lib/utils"
import { getCoreRowModel, useReactTable, createColumnHelper, flexRender, getSortedRowModel, SortingState } from "@tanstack/react-table";
import { Odds } from "../../lib/api";

function countMarketOutcomes(bookmakers: Odds['bookmakers'], marketKey: string) {
    return bookmakers.reduce((total, bookmaker) => {
        const market = bookmaker.markets.find(m => m.key === marketKey);
        return total + (market ? market.outcomes.length : 0);
    }, 0);
}

function calculateAveragePrice(
    bookmakers: Odds['bookmakers'],
    marketKey: string,
    outcomeName: string,
    returnPoints: boolean = false
): number {
    const values = bookmakers.flatMap(b => {
        const market = b.markets.find(m => m.key === marketKey);
        const outcome = market?.outcomes.find(o => o.name === outcomeName);
        return outcome ? [returnPoints ? outcome.point ?? 0 : outcome.price ?? 0] : [];
    });
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function OddsDataTable({ odds }: { odds: Odds[] }) {
    const columnHelper = createColumnHelper<Odds>();
    const nflStartDate = useMemo(() => getNflStartDate(), []);

    const [sorting, setSorting] = useState<SortingState>([
        { id: 'commence_time', desc: false }
    ]);

    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const now = new Date();
        if (now < nflStartDate) {
            return nflStartDate;
        }
        const weeksSinceStart = Math.floor((now.getTime() - nflStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        return new Date(nflStartDate.getTime() + weeksSinceStart * 7 * 24 * 60 * 60 * 1000);
    });

    const currentWeekNumber = useMemo(() => {
        const diffTime = currentWeekStart.getTime() - nflStartDate.getTime();
        const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
        return diffWeeks + 1;
    }, [currentWeekStart, nflStartDate]);

    const columns = useMemo(() => [
        columnHelper.accessor('home_team', {
            header: 'Home Team',
            cell: info => info.getValue(),
        }),
        columnHelper.accessor('away_team', {
            header: 'Away Team',
            cell: info => info.getValue(),
        }),
        columnHelper.accessor('commence_time', {
            header: 'Start Time',
            cell: info => {
                const date = new Date(info.getValue());
                const dayAbbr = date.toLocaleString('en-US', { weekday: 'short' });
                const monthDay = date.toLocaleString('en-US', { month: '2-digit', day: '2-digit' });
                const time = date.toLocaleString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }).replace(/^(\d):/, '0$1:');
                return `${dayAbbr} ${monthDay} ${time}`.replace(/,/g, '');
            },
            sortingFn: 'datetime',
        }),
        columnHelper.accessor(row => calculateAveragePrice(row.bookmakers, 'h2h', row.home_team), {
            header: 'Home H2H Avg',
            cell: info => info.getValue().toFixed(2),
        }),
        columnHelper.accessor(row => calculateAveragePrice(row.bookmakers, 'h2h', row.away_team), {
            header: 'Away H2H Avg',
            cell: info => info.getValue().toFixed(2),
        }),
        columnHelper.accessor(row => calculateAveragePrice(row.bookmakers, 'spreads', row.home_team, true), {
            header: 'Home Spread Avg',
            cell: info => info.getValue().toFixed(1),
        }),
        columnHelper.accessor(row => calculateAveragePrice(row.bookmakers, 'spreads', row.away_team, true), {
            header: 'Away Spread Avg',
            cell: info => info.getValue().toFixed(1),
        }),
        columnHelper.accessor(row => calculateAveragePrice(row.bookmakers, 'totals', 'Over', true), {
            header: 'Total Points Avg',
            cell: info => info.getValue().toFixed(1),
        }),
        // Removed the 'Totals Under Avg' column
    ], [columnHelper]);

    const filteredOdds = useMemo(() => {
        const weekEnd = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        return odds.filter(odd => {
            const oddDate = new Date(odd.commence_time);
            return oddDate >= currentWeekStart && oddDate < weekEnd;
        });
    }, [odds, currentWeekStart]);

    const isLastWeek = useMemo(() => {
        const nextWeekStart = new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        return !odds.some(odd => new Date(odd.commence_time) >= nextWeekStart);
    }, [odds, currentWeekStart]);

    const table = useReactTable({
        data: filteredOdds,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    const goToPreviousWeek = () => {
        const newWeekStart = new Date(currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (newWeekStart >= nflStartDate) {
            setCurrentWeekStart(newWeekStart);
        }
    };

    const goToNextWeek = () => {
        if (!isLastWeek) {
            setCurrentWeekStart(new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000));
        }
    };

    return (
        <div className="overflow-x-auto">
            <div className="flex justify-between mb-2 text-sm">
                <button
                    onClick={goToPreviousWeek}
                    disabled={currentWeekStart <= nflStartDate}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Prev
                </button>
                <span className="font-mono">Week {currentWeekNumber}</span>
                <button
                    onClick={goToNextWeek}
                    disabled={isLastWeek}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    Next
                </button>
            </div>
            <table className="w-full bg-white font-mono text-xs border-collapse">
                <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id} className="bg-gray-100">
                            {headerGroup.headers.map(header => (
                                <th
                                    key={header.id}
                                    className="px-1 py-1 text-left border cursor-pointer"
                                    onClick={header.column.getToggleSortingHandler()}
                                >
                                    <div className="flex items-center">
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        <span className="ml-1">
                                            {{
                                                asc: '↑',
                                                desc: '↓',
                                            }[header.column.getIsSorted() as string] ?? null}
                                        </span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.map(row => (
                        <tr key={row.id} className="border-b hover:bg-gray-50">
                            {row.getVisibleCells().map(cell => (
                                <td key={cell.id} className="px-1 py-1 border">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
