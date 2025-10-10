// import { SLEEP_TIME, SIZE } from './config.ts';

// export function sleep(ms = SLEEP_TIME) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

// export function sleep(milliseconds = SLEEP_TIME) {
//   var start = new Date().getTime();
//   for (var i = 0; i < 1e7; i++) {
//     if ((new Date().getTime() - start) > milliseconds){
//       break;
//     }
//   }
// }

export function shuffle<T>(array: T[]): T[] {
	return array
		.map(value => ({ value, sort: Math.random() }))
		.sort((a, b) => a.sort - b.sort)
		.map(({ value }) => value);
}

// export function sleep(notch = SLEEP_TIME) {
// 	const sleepNotch = [
// 		100003, 200003, 300007, 400009, 500009, 600011, 700001, 10000019,
// 	];
// 	const n = sleepNotch[notch];
// 	for (let i = 2; i < n - 1; i++) {
// 		if (n % i === 0) {
// 			return false;
// 		}
// 	}
// 	return true;
// }

// export function randInt(max = SIZE) {
// 	// renvoie 0 <= r < max
// 	return Math.floor(Math.random() * max);
// }

export function euclideanDistance(point1: number[], point2: number[]) {
	return Math.sqrt((point2[0] - point1[0]) ** 2 + (point2[1] - point1[1]) ** 2);
}

export function dichoSearch(
	tab: [number, number, number][],
	v: [number, number, number]
) {
	let a = 0;
	let b = tab.length;
	const vDist = v[2];
	while (a < b) {
		const m = Math.floor((a + b) / 2);
		if (tab[m][2] < vDist) {
			a = m + 1;
		} else {
			b = m;
		}
	}
	return a;
}
