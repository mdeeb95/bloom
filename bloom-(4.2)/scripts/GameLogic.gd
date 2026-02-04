extends Node

# GameLogic.gd - Autoload Singleton
# Handles game constants and mathematical calculations.

const ANIMATION_CONFIG = {
	"BLOOM": {
		"DURATION": 0.8,
		"BASE_STAGGER": 0.05,
		"MIN_STAGGER": 0.01,
		"EASE": Tween.EASE_OUT # Using Godot's built-in ease
	},
	"WOBBLE": {
		"DURATION": 0.15,
		"ROTATION_OFFSET": 10.0,
		"REPEATS": 5,
		"EASE": Tween.EASE_IN_OUT,
		"RETURN_DURATION": 0.2,
		"RETURN_EASE": Tween.EASE_OUT
	},
	"SCATTER": {
		"MIN_DURATION": 2.0,
		"GRAVITY": 1000.0,
		"FORCE_RANGE": [100.0, 600.0],
		"ROTATION_RANGE": [-180.0, 180.0],
		"EASE": Tween.EASE_OUT
	}
}

const LAYOUT_CONFIG = {
	"RING_SHRINK_FACTOR": 0.01,
	"MIN_RING_SCALE": 0.2,
	"BASE_VISIBILITY": 0.25,
	"VISIBILITY_GROWTH": 0.05,
	"MAX_VISIBILITY": 0.50
}

func generate_round_colors(level: int, difficulty_boost: float = 0.0) -> Dictionary:
	var base_hue = randf() # 0.0 to 1.0
	var base_sat = randf_range(0.60, 0.85)
	var base_light = randf_range(0.60, 0.75)

	var shift_amount = 15.0 / 360.0 # Standardize to 0-1
	if level >= 15:
		shift_amount = 1.0 / 360.0
	elif level >= 10:
		shift_amount = 3.0 / 360.0
	elif level >= 3:
		shift_amount = 7.0 / 360.0

	shift_amount += (difficulty_boost * 25.0 / 360.0)

	var direction = 1.0 if randf() > 0.5 else -1.0
	var odd_hue = fposmod(base_hue + (shift_amount * direction), 1.0)
	var odd_sat = base_sat + (randf_range(-0.05, 0.05) if level > 3 else 0.0)
	odd_sat = clamp(odd_sat, 0.0, 1.0)

	return {
		"primary": hsl_to_color(base_hue, base_sat, base_light),
		"odd": hsl_to_color(odd_hue, odd_sat, base_light)
	}

func fibonacci(n: int) -> int:
	var a = 0
	var b = 1
	for i in range(n):
		var temp = a
		a = b
		b = temp + b
	return a

func get_ring_config(level: int) -> Dictionary:
	var count = min(fibonacci(level + 5), 34)
	
	var base_petal_size = 64.0
	var size_growth_per_level = 14.0
	var petal_size = base_petal_size + (level - 1) * size_growth_per_level

	var radius = 20.0
	for i in range(1, level):
		var current_size = base_petal_size + (i - 1) * size_growth_per_level
		var visibility_factor = min(
			LAYOUT_CONFIG.BASE_VISIBILITY + (i * (LAYOUT_CONFIG.VISIBILITY_GROWTH * 0.5)),
			LAYOUT_CONFIG.MAX_VISIBILITY
		)
		radius += current_size * visibility_factor
	
	return {
		"count": count,
		"radius": radius,
		"petalSize": petal_size
	}

# Helper to convert HSL to Godot Color
func hsl_to_color(h: float, s: float, l: float) -> Color:
	# h, s, l are 0-1
	# Godot Color.from_hsv uses Hue, Saturation, Value
	# Conversion:
	var v = l + s * min(l, 1.0 - l)
	var sv = 0.0 if v == 0 else 2.0 * (1.0 - l / v)
	return Color.from_hsv(h, sv, v)
