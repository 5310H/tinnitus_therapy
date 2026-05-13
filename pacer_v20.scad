// Tinnitus Pacer - V20 "Pebble" Clamshell (Warm/Organic Design)
$fn = 100;

lra_d = 10.3; lra_h = 3.8; wall = 2.0;
band_w = 15.5; band_t = 3.5;

module base_plate() {
    difference() {
        union() {
            // Organic "Pebble" Base
            hull() {
                translate([0,0,0]) cylinder(h=2, d=lra_d + 10);
                translate([0,12,0]) cylinder(h=2, d=band_w + 6);
            }
            // Inner Motor Seat
            cylinder(h=wall + lra_h, d=lra_d + 4);
            // Lower Chimney Support
            translate([-(band_w+6)/2, 8, 0]) cube([band_w+6, 10, 15]);
        }
        // Motor Cavity
        translate([0,0,wall]) cylinder(h=10, d=lra_d);
        // Band Slot
        translate([-band_w/2, 11, -1]) cube([band_w, band_t, 20]);
        // Wire Exit Notch
        translate([-5, -8, wall]) cube([10, 10, 3]);
        // Screw Holes for Clamshell Join (M2 or Small Wood Screw)
        translate([8, 0, -1]) cylinder(h=10, d=2);
        translate([-8, 0, -1]) cylinder(h=10, d=2);
    }
}

module top_cap() {
    difference() {
        // The "Warm" Outer Shell
        hull() {
            translate([0,0,0]) sphere(d=lra_d + 14);
            translate([0,12,0]) sphere(d=band_w + 8);
        }
        // Cut the sphere in half to make a cap
        translate([-20,-20,-40]) cube([40,40,40]);
        // Internal hollow for motor top
        translate([0,0,-1]) cylinder(h=lra_h, d=lra_d+1);
        // Band Clearance
        translate([-(band_w+1)/2, 10, -1]) cube([band_w+1, band_t+1, 20]);
        // Screw Counter-sinks
        translate([8, 0, 2]) cylinder(h=10, d=4); // Hidden screw heads
        translate([8, 0, -5]) cylinder(h=10, d=2.2);
        translate([-8, 0, 2]) cylinder(h=10, d=4);
        translate([-8, 0, -5]) cylinder(h=10, d=2.2);
    }
}

// --- RENDER THE KIT ---
translate([-25, 0, 0]) base_plate(); // Piece 1
translate([25, 0, 0]) base_plate();  // Piece 2
translate([-25, 30, 0]) top_cap();    // Piece 3
translate([25, 30, 0]) top_cap();     // Piece 4