(function() {
    // console.log($);
    console.log("I'm not insane..");

    var header = document.getElementsByTagName('header')[0];
    if (header) {
        header.addEventListener('click', function(e) {
            location.href = '/';
        });
    }
})();
