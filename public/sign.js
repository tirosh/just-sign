(function() {
    console.log('Sign here..');

    var ongoingTouches = [];
    var form = document.getElementById('signature');
    var reset = document.getElementById('reset');
    var sign = document.querySelector('input[name="sign"');
    var blank = document.getElementById('blank');
    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');

    var signing, pLast;
    var pRadius = 10;
    ctx.lineJoin = ctx.lineCap = 'round';

    canvas.addEventListener('mousedown', function(e) {
        signing = true;
        pLast = pos(e);
    });

    canvas.addEventListener('mousemove', function(e) {
        if (signing) {
            var pCurr = pos(e);
            var dist = getDist(pLast, pCurr);
            var angle = getAngle(pLast, pCurr);
            var nextColor = randomColor();

            for (var i = 0; i < dist; i += 5) {
                x = pLast.x + Math.sin(angle) * i - pRadius;
                y = pLast.y + Math.cos(angle) * i - pRadius;
                ctx.beginPath();
                ctx.arc(
                    x + pRadius / 2,
                    y + pRadius / 2,
                    pRadius,
                    false,
                    Math.PI * 2,
                    false
                );
                ctx.closePath();
                ctx.strokeStyle = ctx.fillStyle = nextColor;
                ctx.fill();
                ctx.stroke();
            }
            pLast = pCurr;
        }
    });

    document.addEventListener('mouseup', function(e) {
        signing = false;
    });

    form.addEventListener('submit', function(e) {
        if (canvas.toDataURL() !== blank.toDataURL())
            sign.value = canvas.toDataURL();
    });

    reset.addEventListener('click', function(e) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    function startup() {
        var el = document.getElementById('canvas');
        el.addEventListener('touchstart', handleStart, false);
        el.addEventListener('touchend', handleEnd, false);
        el.addEventListener('touchcancel', handleCancel, false);
        el.addEventListener('touchmove', handleMove, false);
    }

    document.addEventListener('DOMContentLoaded', startup);

    function pos(e) {
        return {
            x: e.clientX - canvas.getBoundingClientRect().left,
            y: e.clientY - canvas.getBoundingClientRect().top
        };
    }

    function getDist(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }
    function getAngle(p1, p2) {
        return Math.atan2(p2.x - p1.x, p2.y - p1.y);
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
