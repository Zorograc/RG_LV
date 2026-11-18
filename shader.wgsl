
const positions = array(
    vec3f(-0.5, -0.5, 0),
    vec3f( 0.5, -0.5, 0),
    vec3f( 0.0,  0.5, 0),
);

const colors = array(
    vec4f(1, 0, 0, 1),
    vec4f(0, 1, 0, 1),
    vec4f(0, 0, 1, 1),
);

struct VertexInput {
    @location(0) position: vec3f, 
    @location(1) color: vec4f
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f, // vrednost pred interpolacijo
}

struct FragmentInput {
    @location(0) color: vec4f, // vrednost po interpolaciji
}

struct FragmentOutput {
    @location(0) color: vec4f,
}

@group(0) @binding(0)
var<uniform> transform: mat4x4f;


@vertex
fn vertex(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    output.position = transform * vec4f(input.position, 1.0);
    output.color = input.color;

    return output;
}

@fragment
fn fragment(input: FragmentInput) -> FragmentOutput {
    var output: FragmentOutput;

    output.color = input.color;

    return output;
}


