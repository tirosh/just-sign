(function() {
    console.log('Sign here..');

    var form = document.getElementById('signature');
    var sign = document.querySelector('input[name="sign"');
    var blank = document.getElementById('blank');
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');

    var signing = false;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 20;

    canvas.addEventListener('mousedown', function(e) {
        ctx.moveTo(pos(e).x, pos(e).y);
        signing = true;
    });

    canvas.addEventListener('mousemove', function(e) {
        if (signing) {
            ctx.strokeStyle = randomColor();
            ctx.beginPath();
            ctx.lineTo(pos(e).x, pos(e).y);
            ctx.stroke();
        }
    });

    document.addEventListener('mouseup', function(e) {
        signing = false;
    });

    form.addEventListener('submit', function(e) {
        if (canvas.toDataURL() !== blank.toDataURL())
            sign.value = canvas.toDataURL();
    });

    function pos(e) {
        return {
            x: e.clientX - canvas.getBoundingClientRect().left,
            y: e.clientY - canvas.getBoundingClientRect().top
        };
    }

    function randomColor() {
        var colorChars = '0123456789abcdef';
        var colorString = '#';
        for (var i = 0; i < 6; i++) {
            var randomIndex = Math.floor(Math.random() * colorChars.length);
            colorString += colorChars[randomIndex];
        }
        return colorString;
    }
})();
