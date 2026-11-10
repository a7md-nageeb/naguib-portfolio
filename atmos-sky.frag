
precision highp float;
uniform float uTime;
uniform float uGradientMixer;
uniform float uYCompression;

varying vec3 vPos;
varying vec2 vUv;

vec4 permute(vec4 x)
{
    return mod(((x*34.0)+1.0)*x, 289.0);
}

//	Classic Perlin 2D Noise 
//	by Stefan Gustavson
//
vec2 fade(vec2 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

float cnoise(vec2 P){
    vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
    vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
    Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation
    vec4 ix = Pi.xzxz;
    vec4 iy = Pi.yyww;
    vec4 fx = Pf.xzxz;
    vec4 fy = Pf.yyww;
    vec4 i = permute(permute(ix) + iy);
    vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0; // 1/41 = 0.024...
    vec4 gy = abs(gx) - 0.5;
    vec4 tx = floor(gx + 0.5);
    gx = gx - tx;
    vec2 g00 = vec2(gx.x,gy.x);
    vec2 g10 = vec2(gx.y,gy.y);
    vec2 g01 = vec2(gx.z,gy.z);
    vec2 g11 = vec2(gx.w,gy.w);
    vec4 norm = 1.79284291400159 - 0.85373472095314 * vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
    g00 *= norm.x;
    g01 *= norm.y;
    g10 *= norm.z;
    g11 *= norm.w;
    float n00 = dot(g00, vec2(fx.x, fy.x));
    float n10 = dot(g10, vec2(fx.y, fy.y));
    float n01 = dot(g01, vec2(fx.z, fy.z));
    float n11 = dot(g11, vec2(fx.w, fy.w));
    vec2 fade_xy = fade(Pf.xy);
    vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
    float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
    return 2.3 * n_xy;
}

vec3 rgb( int r, int g, int b ) {
    return vec3(float(r) / 255.0, float(g) / 255.0, float(b) / 255.0);
}

vec3 multimix(vec3 elements[3], float v) {
    int i1 = int(v);

    float completion = mod(v, 1.0);

    if (i1 == 0) {
        return mix(elements[0], elements[1], completion);
    } else if (i1 == 1) {
        return mix(elements[1], elements[2], completion);
    }
}

vec3 gradientMultimix(vec3 elements[8], float v) {
    int i1 = int(v);

    float completion = mod(v, 1.0);

    if (i1 == 0) {
        return mix(elements[0], elements[1], completion);
    } else if (i1 == 1) {
        return mix(elements[1], elements[2], completion);
    } else if (i1 == 2) {
        return mix(elements[2], elements[3], completion);
    } else if (i1 == 3) {
        return mix(elements[3], elements[4], completion);
    } else if (i1 == 4) {
        return mix(elements[4], elements[5], completion);
    } else if (i1 == 5) {
        return mix(elements[5], elements[6], completion);
    } else if (i1 == 6) {
        return mix(elements[6], elements[7], completion);
    }
}

vec3 gradient(vec3 colorTop, vec3 colorBottom, vec3 colorNoise, float yFactor, float noise) {
    vec3 vertical_gradient = mix(colorTop, colorBottom, yFactor);
    return mix(vertical_gradient, colorNoise, noise * (1. - yFactor));
}

void main()
{   
    float yFactor = clamp(.5 - (vPos.y * uYCompression) / 2., 0., 1.);
    float speed = .025;
    float noise = cnoise(vPos.xy * .025 + uTime * speed);
    noise += cnoise(vPos.xy * .025 - uTime * speed);
    noise = clamp(noise, 0., 1.);

    vec3 gradients[8];
    gradients[0] = gradient(rgb(112, 148, 235), rgb(222, 230, 252), rgb(94, 132, 225), yFactor, noise);
    gradients[1] = gradient(rgb(116, 136, 234), rgb(255, 192, 148), rgb(116, 136, 234), yFactor, noise);
    gradients[2] = gradient(rgb(255, 192, 148), rgb(222, 229, 253), rgb(136, 162, 247), yFactor, noise);
    gradients[3] = gradient(rgb(136, 162, 247), rgb(222, 229, 253), rgb(136, 162, 247), yFactor, noise);
    gradients[4] = gradient(rgb(136, 162, 247), rgb(222, 229, 253), rgb(255, 192, 148), yFactor, noise);
    gradients[5] = gradient(rgb(253, 175, 120), rgb(255, 230, 213), rgb(253, 175, 120), yFactor, noise);
    gradients[6] = gradient(rgb(253, 175, 120), rgb(197, 211, 254), rgb(90, 108, 216), yFactor, noise);
    gradients[7] = gradient(rgb(90, 108, 216), rgb(197, 211, 254), rgb(90, 108, 216), yFactor, noise);

    float gradientLength = 8.;
    vec3 color = gradientMultimix(gradients, uGradientMixer * (gradientLength - 1.));

    // Fine screen-space grain, held steady to avoid flicker.
    float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
    color += grain * 0.035;
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
