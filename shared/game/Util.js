module.exports.shuffle = function(arr) {
    let length = arr.length, temp, random

    while(0 !== length){
        random = Math.floor(Math.random() * length)
        length--

        // swap
        temp = arr[length]
        arr[length] = arr[random]
        arr[random] = temp
    }

    return arr
}

module.exports.rand = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
