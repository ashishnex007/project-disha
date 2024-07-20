
import { TranscriberData } from "../hooks/useTranscriber";

interface Props {
    transcribedData: TranscriberData | undefined;
}

export default function Transcript({ transcribedData }: Props) {

    return (
        <div
            className='w-full flex flex-col my-2 p-4 max-h-[20rem] overflow-y-auto'
        >
            {transcribedData && (
                <div className='w-full flex flex-row mb-2 bg-white rounded-lg p-4 shadow-xl shadow-black/5 ring-1 ring-slate-700/10'>
                    {transcribedData.text}
                </div>
            )}
        </div>
    );
}
