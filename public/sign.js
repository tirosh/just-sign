(function() {
    console.log('Sign here..');

    var form = document.getElementById('signature');
    var signature = document.querySelector('input[name="sign"');
    var canvas = document.getElementById('canvas');
    var blank = document.getElementById('blank');
    var ctx = canvas.getContext('2d');

    form.addEventListener('submit', function(e) {
        if (canvas.toDataURL() !== blank.toDataURL())
            signature.value = canvas.toDataURL();
    });

    var pos = { x: 0, y: 0 };
    var signing = false;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 20;

    canvas.addEventListener('mousedown', function(e) {
        signing = true;
        updatePos(e);
    });
    canvas.addEventListener('mousemove', function(e) {
        sign(e);
    });
    document.addEventListener('mouseup', function(e) {
        signing = false;
    });

    function sign(e) {
        if (!signing) return;
        ctx.strokeStyle = randomColor();
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(
            e.clientX - canvas.getBoundingClientRect().left,
            e.clientY - canvas.getBoundingClientRect().top
        );
        ctx.stroke();
        updatePos(e);
    }

    function updatePos(e) {
        return (pos = {
            x: e.clientX - canvas.getBoundingClientRect().left,
            y: e.clientY - canvas.getBoundingClientRect().top
        });
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
