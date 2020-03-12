(function() {
    console.log($);
    console.log("I'm not insane..");

    var canvas = document.getElementById('canvas');
    var ctx = canvas.getContext('2d');

    canvas.addEventListener('mouseup', function(e) {
        var mouseoverCanvas = {
            x: e.clientX - canvas.getBoundingClientRect().left,
            y: e.clientY - canvas.getBoundingClientRect().top
        };
        drawStickman(new Stickman(mouseoverCanvas.x, mouseoverCanvas.y));
    });

    function Stickman(x, y) {
        this.headR = 50;
        this.torso = 100;
        this.legs = 100;
        this.arms = 100;
        this.x = x;
        this.y = y + (this.headR * 2 + this.torso + this.legs) / 2;
    }

    function drawStickman(stMn) {
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();

        // draw legs
        ctx.moveTo(stMn.x - stMn.legs, stMn.y);
        ctx.lineTo(stMn.x, stMn.y - stMn.legs);
        ctx.lineTo(stMn.x + stMn.legs, stMn.y);
        ctx.strokeStyle = randomColor();
        ctx.stroke();
        ctx.beginPath();

        // draw arms
        ctx.moveTo(
            stMn.x + stMn.arms,
            stMn.y - stMn.legs - stMn.torso - stMn.headR
        );
        ctx.lineTo(stMn.x, stMn.y - stMn.legs - stMn.torso * 0.62);
        ctx.lineTo(
            stMn.x - stMn.arms,
            stMn.y - stMn.legs - stMn.torso - stMn.headR
        );
        ctx.strokeStyle = randomColor();
        ctx.stroke();
        ctx.beginPath();

        // draw torso
        ctx.moveTo(stMn.x, stMn.y - stMn.legs);
        ctx.lineTo(stMn.x, stMn.y - stMn.legs - stMn.torso);
        ctx.strokeStyle = randomColor();
        ctx.stroke();
        ctx.beginPath();

        // draw head
        var x = stMn.x;
        var y = stMn.y - stMn.legs - stMn.torso - stMn.headR;
        ctx.arc(x, y, stMn.headR, 0, Math.PI * 2, true); // head circle
        ctx.moveTo(x + stMn.headR * 0.62, y);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = randomColor();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, stMn.headR * 0.62, 0, Math.PI, false); // mouth
        x -= stMn.headR * 0.4;
        y -= 20;
        ctx.moveTo(x + 5, y);
        ctx.strokeStyle = randomColor();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2, true); // right eye
        x += stMn.headR * 0.4 * 2;
        ctx.moveTo(x + 5, y);
        ctx.arc(x, y, 5, 0, Math.PI * 2, true); // left eye
        ctx.strokeStyle = randomColor();
        ctx.stroke();
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
