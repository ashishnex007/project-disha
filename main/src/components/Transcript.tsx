
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
                <div className='w-full flex flex-row p-4'>
                    {transcribedData.text}
                </div>
            )}
        </div>
    );
}
