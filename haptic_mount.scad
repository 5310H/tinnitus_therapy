// M5Stack Haptic Unit Finger Saddle - Professional Version
// Designed for 10mm Velcro straps

$fn = 100;

// Dimensions
unit_w = 25; 
unit_l = 25;
strap_w = 11;
thickness = 3.0; // Slightly thicker for durability
finger_rad = 11; // Slightly larger radius for better fit across sizes
corner_rad = 3;
cover_h = 12;

module rounded_plate(w, l, h, r) {
    hull() {
        translate([-w/2 + r, -l/2 + r, r]) sphere(r);
        translate([w/2 - r, -l/2 + r, r]) sphere(r);
        translate([-w/2 + r, l/2 - r, r]) sphere(r);
        translate([w/2 - r, l/2 - r, r]) sphere(r);
    }
}

difference() {
    union() {
        // Main Base Plate with rounded corners
        translate([0, 0, 0])
            rounded_plate(unit_w + 12, unit_l, thickness, corner_rad);
        
        // Refined Finger Saddle (Tapered edges)
        translate([0, 0, -finger_rad + 0.5])
            rotate([90, 0, 0])
            difference() {
                cylinder(r = finger_rad + thickness, h = unit_l, center = true);
                cylinder(r = finger_rad, h = unit_l + 2, center = true);
                translate([0, finger_rad + 1, 0])
                    cube([finger_rad*4, finger_rad*2, unit_l + 4], center = true);
            }
            
        // Integrated Protective Cover (Smoother profile)
        hull() {
            translate([0, unit_l/2 - 4, thickness + 1])
                sphere(d=16);
            translate([0, unit_l/2 - 10, thickness])
                cube([18, 1, 1], center=true);
        }
    }

    // Recessed Strap Slots
    for(x = [-unit_w/2 - 4, unit_w/2 + 4]) {
        translate([x, 0, thickness/2])
            hull() {
                translate([0, -strap_w/2, 0]) cylinder(d=2.5, h=thickness+2, center=true);
                translate([0, strap_w/2, 0]) cylinder(d=2.5, h=thickness+2, center=true);
            }
    }
        
    // Internal cavity for the Grove connector
    translate([0, unit_l/2 - 2, thickness + 4])
        cube([14, 12, 10], center = true);

    // Cable exit (rounded)
    translate([0, unit_l/2 + 4, thickness + 2])
        rotate([90, 0, 0])
        cylinder(d=8, h=10);

    // Professional Screw Mappings (M2 with Countersink)
    for(x = [-1, 1], y = [-1, 1]) {
        translate([x * (unit_w/2 - 4), y * (unit_l/2 - 4), -1]) {
            cylinder(d=2.2, h=thickness + 5); // Hole
            translate([0, 0, thickness + 0.5]) {
                cylinder(d1=2.2, d2=4.5, h=2); // Countersink
                // Top clearance
                translate([0, 0, 1]) cylinder(d=4.5, h=10);
            }
        }
    }
}