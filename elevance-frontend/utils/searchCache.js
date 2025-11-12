const defaultFilters = {
    zip: "",
    query: "",
    inNetwork: false,
    costMin: "",
    costMax: "",
    radius: "",
};

let cache = {
    filters: { ...defaultFilters },
    results: [],
    sortType: "quality",
    sortDirection: "desc",
};

export const getSearchCache = () => ({
    filters: { ...cache.filters },
    results: [...cache.results],
    sortType: cache.sortType,
    sortDirection: cache.sortDirection,
});

export const setSearchCache = ({ filters, results, sortType, sortDirection }) => {
    if (filters) {
        cache.filters = { ...cache.filters, ...filters };
    }
    if (Array.isArray(results)) {
        cache.results = [...results];
    }
    if (sortType) cache.sortType = sortType;
    if (sortDirection) cache.sortDirection = sortDirection;
};

export const resetSearchCache = () => {
    cache = {
        filters: { ...defaultFilters },
        results: [],
        sortType: "quality",
        sortDirection: "desc",
    };
};

export { defaultFilters };