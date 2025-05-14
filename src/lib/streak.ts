export const calculateStreak = (last_login_date: string, previous_streak: number, longest_streak: number) => {
		if (!last_login_date) {
			console.log("No last login date found");
			return { current: 1, longest: 1 };
		}

		// Compare dates, not timestamps
		const lastLoginDay = new Date(last_login_date);
		lastLoginDay.setHours(0, 0, 0, 0);
		
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		console.log("Last login day:", lastLoginDay);
		console.log("Today:", today);
		const diffInDays = Math.floor(
			(today.getTime() - lastLoginDay.getTime()) / (1000 * 60 * 60 * 24)
		);
		console.log("Diff in days:", diffInDays);
		if (diffInDays > 1) {
			return { current: 1, longest: longest_streak };
		} else {
			if (today.getDate() !== lastLoginDay.getDate()) {
				console.log("Add streak")
        return { current: previous_streak + 1, longest: longest_streak + 1 };
			}else{
				return { current: previous_streak, longest: longest_streak };
			}

		}
} 