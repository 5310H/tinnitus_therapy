$fa = 18;
$fs = 1.0;

// -------------------------
// PARAMETERS
// -------------------------
band_width     = 5.5;
band_depth     = 4.5;
arm_length     = 8.0;
motor_diameter = 10.0;
mastoid_angle  = 0;

// Derived offsets
arm_end_x = 6 + arm_length;
pod_x     = arm_end_x + 4;
pad_x     = pod_x + 6;

// -------------------------
// UTILS
// -------------------------
module smoothed_block(p1, size, r=2) {
    hull() {
        for (x=[p1[0]+r, p1[0]+size[0]-r],
             y=[p1[1]+r, p1[1]+size[1]-r])
            translate([x,y,p1[2]]) cylinder(r=r, h=size[2]);
    }
}

// -------------------------
// MAIN SADDLE
// -------------------------
module saddle_full(is_left=true) {

    // -------------------------
    // CLIP (rounded, band cavity)
    // -------------------------
    difference() {
        smoothed_block([-8,-6,-10],[16,14,20], r=2.5);

        // band cavity
        hull() {
            translate([0,0,-11]) cylinder(d=band_width, h=22);
            translate([0,2,-11]) cylinder(d=band_width, h=22);
        }

        // snap entry
        translate([-1.5,-10,-11]) cube([3,10,22]);
    }

    // -------------------------
    // ARM (with wire groove)
    // -------------------------
    difference() {
        hull() {
            translate([6,0,0]) sphere(d=8);
            translate([arm_end_x,2,0]) sphere(d=6);
        }

        // wire groove along arm
        hull() {
            translate([6,-2,0]) sphere(d=2.2);
            translate([arm_end_x,0,0]) sphere(d=2.2);
        }
    }

    // -------------------------
    // MOTOR POD (visible cavity + wire tunnel)
    // -------------------------
    difference() {
        // outer pod
        translate([pod_x,4,0]) sphere(d=16);

        // motor cavity (visible)
        translate([pod_x,10,0])
            rotate([90,0,0])
                cylinder(d=motor_diameter+0.6, h=8, center=true);

        // wire tunnel (visible)
        translate([pod_x-3,4,0])
            rotate([0,90,0])
                cylinder(d=3, h=10, center=true);

        // flat face (thin slice)
        translate([pod_x,12,0])
            cube([20,1.2,20], center=true);
    }

    // -------------------------
    // MASTOID PAD (angled)
    // -------------------------
    translate([pod_x,4,0])
    rotate([0,0,mastoid_angle])
    translate([-pod_x,-4,0])
    difference() {
        hull() {
            translate([pad_x,2,0]) sphere(d=10);
            translate([pad_x+6,0,0]) sphere(d=6);
        }

        // anti-slip micro-dimples (sparse, FreeCAD-tolerable)
        for (dx = [pad_x-2 : 3 : pad_x+4],
             dz = [-3 : 3 : 3])
            translate([dx,6.5,dz]) sphere(d=1.2);
    }

    // -------------------------
    // ANTI-ROTATION TAB
    // -------------------------
    translate([10,6,0])
    hull() {
        sphere(d=3);
        translate([0,2,4]) sphere(d=2);
    }

    // -------------------------
    // HEADBAND WIRE CLIP
    // -------------------------
    translate([0,6,8])
    difference() {
        sphere(d=7);
        // wire pass
        translate([0,0,1])
            rotate([0,90,0])
                cylinder(d=2.5, h=10, center=true);
        // entry slit
        translate([0,0,4])
            cube([10,2,6], center=true);
    }

    // -------------------------
    // INTEGRATED CABLE RELIEF (S-curve cleat)
    // -------------------------
    translate([0,-5,-8])
    difference() {
        sphere(d=7);

        // S-curve channels
        translate([-2,0,0])
            rotate([0,90,0])
                cylinder(d=2, h=10, center=true);
        translate([2,1,0])
            rotate([0,90,0])
                cylinder(d=2, h=10, center=true);

        // open bottom
        translate([0,-4,0])
            cube([10,5,10], center=true);
    }

    // -------------------------
    // TACTILE DOTS + L/R MARK
    // -------------------------
    // tactile dots: 1 for left, 2 for right
    for (i = [0 : (is_left ? 0 : 1)])
        translate([(i*4)-2, 8, -6])
            sphere(d=2.2);

    // L/R engraving (kept simple for FreeCAD)
    translate([0,8.05,0])
    rotate([90,0,0])
    linear_extrude(height=1)
        text(is_left ? "L" : "R", size=5,
             halign="center", valign="center");
}

// -------------------------
// RENDER PAIR
// -------------------------
translate([-25,0,0]) saddle_full(true);
translate([ 25,0,0]) mirror([1,0,0]) saddle_full(false);
