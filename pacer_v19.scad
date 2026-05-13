// Tinnitus Pacer - V19 Full 4-Piece Kit
// 2x Housings + 2x M3 Thumb Knobs
$fn = 80;

lra_d = 10.3; wall = 2.5; 
band_w = 15.5; band_t = 3.5; 

module housing() {
    difference() {
        union() {
            // Rounded Disc
            hull() {
                cylinder(h = 1, d = lra_d + (wall * 2) - 2); 
                translate([0,0,1.5]) cylinder(h = 6.3 - 1.5, d = lra_d + (wall * 2));
            }
            // Rounded Chimney
            translate([-(band_w + 6)/2, lra_d/2, 0])
                minkowski() {
                    cube([band_w + 6, 10, 28]); 
                    sphere(r = 1); 
                }
            // Wire Reliefs
            translate([lra_d/2, -3, 0]) cube([6, 6, 6.3]);
            translate([-(lra_d/2 + 6), -3, 0]) cube([6, 6, 6.3]);
        }
        // Cavities
        translate([0, 0, wall]) cylinder(h = 10, d = lra_d);
        translate([-band_w/2, lra_d/2 + 2.5, -2]) cube([band_w, band_t, 45]);
        translate([0, lra_d/2 + 15, 18]) rotate([90, 0, 0]) cylinder(h = 30, d = 2.9);
        // Wire Cuts
        translate([lra_d/2 - 1, -1.5, wall]) cube([15, 3, 3]);
        translate([-(lra_d/2 + 14), -1.5, wall]) cube([15, 3, 3]);
        // Flat Bottom Trim
        translate([-30,-30,-10]) cube([60,60,10]);
    }
}

module thumb_knob() {
    // This sits on top of a standard M3 screw head
    difference() {
        cylinder(h = 8, d = 12, $fn=6); // Hexagonal grip
        translate([0,0,2]) cylinder(h = 7, d = 5.7, $fn=6); // Socket for M3 head
    }
}

// --- THE 4 PIECE LAYOUT ---
translate([-25, 0, 0]) housing();      // Piece 1: Left Housing
translate([25, 0, 0])  housing();      // Piece 2: Right Housing
translate([0, -25, 0]) thumb_knob();   // Piece 3: Knob A
translate([15, -25, 0]) thumb_knob();  // Piece 4: Knob B