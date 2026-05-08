// M5Stack Haptic Unit Finger Saddle
// Designed for 10mm Velcro straps

$fn = 60;

unit_w = 25; // M5Stack unit width + tolerance
unit_l = 25;
strap_w = 11; // 10mm velcro strap slot
thickness = 2.5;
finger_rad = 10; // Radius for an average adult index finger
cover_h = 10; // Height of the protective cover

difference() {
    union() {
        // Main Base Plate
        translate([-unit_w/2 - 5, -unit_l/2, 0])
            cube([unit_w + 10, unit_l, thickness]);
        
        // Finger Saddle (Curved Bottom)
        translate([0, 0, -finger_rad + 0.5])
            rotate([90, 0, 0])
            difference() {
                cylinder(r = finger_rad + thickness, h = unit_l, center = true);
                cylinder(r = finger_rad, h = unit_l + 2, center = true);
                // Cut top half
                translate([0, finger_rad, 0])
                    cube([finger_rad*3, finger_rad*2, unit_l + 4], center = true);
            }
            
        // Protective Cover Hood
        translate([0, unit_l/2 - 4, thickness])
            cube([18, 8, cover_h], center = true);
    }

    // Strap Slots (Left and Right)
    translate([-unit_w/2 - 3, 0, 0])
        cube([2.5, strap_w, thickness + 2], center = true);
    translate([unit_w/2 + 3, 0, 0])
        cube([2.5, strap_w, thickness + 2], center = true);
        
    // Hollow out the cover for the connector
    translate([0, unit_l/2 - 2, thickness + 2])
        cube([14, 10, cover_h], center = true);

    // Cable exit hole
    translate([0, unit_l/2 + 2, thickness])
        cube([10, 5, 6], center = true);

    // Screw Hole Markers (M2 standard for M5Stack)
    translate([unit_w/2 - 4, unit_l/2 - 4, -1]) cylinder(d=2.2, h=5);
    translate([-unit_w/2 + 4, unit_l/2 - 4, -1]) cylinder(d=2.2, h=5);
    translate([unit_w/2 - 4, -unit_l/2 + 4, -1]) cylinder(d=2.2, h=5);
    translate([-unit_w/2 + 4, -unit_l/2 + 4, -1]) cylinder(d=2.2, h=5);
}