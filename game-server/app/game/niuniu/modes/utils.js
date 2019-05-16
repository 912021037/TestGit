module.exports.getBankerResultIndex = function(results, bankerUID) {
    for(let i = 0; i < results.length; i++) {
        const res = results[i]
        if (res.index === bankerUID) {
            return i
        }
    }
    return -1
}