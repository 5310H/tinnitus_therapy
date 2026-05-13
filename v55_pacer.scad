// V55 - The Master Hollow (Right Side)
// Designed for Shokz-style battery pods
$fn = 60;

difference() {
    // 1. THE MAIN BODY
    hull() {
        translate([-11, -11, 0]) cylinder(r=3, h=18);
        translate([11, -11, 0])  cylinder(r=3, h=18);
        translate([-11, 11, 0])  cylinder(r=3, h=18);
        translate([11, 11, 0])   cylinder(r=3, h=18);
    }

    // 2. THE BIG HOLLOW (This creates the CLIPS)
    // This removes the entire center of the block
    translate([-20, -7.5, 5]) 
        cube([40, 15, 20]); 

    // 3. THE MOTOR HOLE (Skin-Side)
    // This hole goes all the way through the bottom floor
    translate([0, 0, -2]) 
        cylinder(d=10.2, h=10);

    // 4. THE "R" MARKING
    translate([0, 0, 16.5]) 
        linear_extrude(height = 2) 
            text("R", size=9, font="Arial:style=Bold", halign="center");
}