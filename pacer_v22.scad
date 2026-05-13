// Tinnitus Pacer - V22 "Pebble Pocket" (2 Parts Total)
$fn = 120;

lra_d = 10.4; // Slightly wider for a smooth slide-in
lra_h = 3.9; 
band_w = 15.6; 
band_t = 3.6;

module pebble_pocket() {
    difference() {
        // 1. The Ultra-Smooth Outer Body
        hull() {
            sphere(d=lra_d + 12);
            translate([0, 16, 0]) sphere(d=band_w + 6);
        }

        // 2. The "Pocket" (Slide the motor in from the side)
        // This hollows out the inside so you just "stuff" the motor in
        translate([0, 0, 0]) cylinder(h=lra_h, d=lra_d, center=true);
        
        // 3. The Headband Tunnel (Slides through the "neck")
        translate([-band_w/2, 12, -band_t/2]) 
            cube([band_w, band_t, 40]);

        // 4. M3 Tension Hole (Only one hole for the locking screw)
        translate([0, 18, 0]) rotate([0, 90, 0]) cylinder(h=30, d=2.9, center=true);

        // 5. Flatten the Skin-Side (The part that touches your head)
        translate([0, 0, -25 - 2]) cube([50, 50, 50], center=true);
    }
}

// --- RENDER ONLY TWO PIECES ---
translate([-20, 0, 0]) pebble_pocket(); // Left
translate([20, 0, 0]) pebble_pocket();  // Right