// MSKR Saddle – CSG-style OpenSCAD model
// Save as: saddle.scad (or saddle.csg if your tool accepts it)

$fn = 48;

module saddle(is_left = true) {

    // ----- Clip -----
    difference() {
        // outer
        translate([0,0,0])
            cube([20,16,20], center=true);

        // inner cavity
        translate([0,0,0])
            cube([10.2,9.6,22], center=true);

        // opening
        translate([0,-12,0])
            cube([4,24,24], center=true);
    }

    // ----- Forward arm -----
    difference() {
        translate([8,0,-4])
            cube([14,6,6], center=true);

        translate([12,0,-8])
            rotate([15,0,0])
                cube([16,8,8], center=true);
    }

    // ----- Motor cradle -----
    difference() {
        // outer
        translate([13,0.9,-4])
            rotate([0,10,0])
                cube([14,14,5], center=true);

        // inner cavity
        translate([13,0.9,-4])
            rotate([0,10,0])
                cube([10.4,10.4,6], center=true);

        // corner reliefs
        for (sx = [-1,1], sy = [-1,1])
            translate([13 + sx*5, 0.9 + sy*5, -4])
                rotate([0,10,0])
                    cube([3,3,8], center=true);
    }

    // ----- Lips -----
    // top
    translate([13,0.9,-1])
        cube([12,2,2], center=true);

    // bottom
    translate([13,0.9,-7])
        cube([12,2,2], center=true);

    // ----- Anti-rotation tab (left only) -----
    if (is_left) {
        translate([13,5,-4])
            cube([4,2,4], center=true);
    }

    // ----- Wire channels -----
    // top groove
    difference() {
        // nothing to subtract from here; these are conceptual cuts
    }

    // top groove cut
    translate([4,-8,-1])
        cube([22,2,1.6], center=true);

    // rear relief
    translate([-8,-8,-2])
        cube([6,2,4], center=true);

    // downward groove (left only)
    if (is_left) {
        translate([0,-8,-2])
            cube([2,2,14], center=true);
    }

    // ----- Mastoid pad -----
    union() {
        translate([18,0,-4])
            cube([10,10,4], center=true);

        translate([21,0,-4])
            cube([6,10,4], center=true);

        translate([22,0,-4])
            cylinder(r=5, h=4, center=true);
    }
}

// Left and right saddles, spaced apart
translate([-25,0,0]) saddle(true);
translate([ 25,0,0]) saddle(false);